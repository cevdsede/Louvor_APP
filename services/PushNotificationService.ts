import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY || '';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const getRegistration = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker nao suportado neste navegador.');
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration();
  return existingRegistration || navigator.serviceWorker.ready;
};

const serializeSubscription = (subscription: PushSubscription) => {
  const payload = subscription.toJSON();
  return {
    endpoint: payload.endpoint || subscription.endpoint,
    p256dh: payload.keys?.p256dh || '',
    auth: payload.keys?.auth || ''
  };
};

const PushNotificationService = {
  isSupported() {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      Boolean(VAPID_PUBLIC_KEY)
    );
  },

  getPublicKeyConfigured() {
    return Boolean(VAPID_PUBLIC_KEY);
  },

  async getPermissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  async getCurrentSubscription() {
    if (!this.isSupported()) return null;
    const registration = await getRegistration();
    return registration.pushManager.getSubscription();
  },

  async enable(memberId: string) {
    if (!memberId) {
      throw new Error('Usuario nao encontrado.');
    }

    if (!this.isSupported()) {
      throw new Error(
        VAPID_PUBLIC_KEY
          ? 'Notificacoes push nao sao suportadas neste navegador.'
          : 'Configure VITE_PUSH_VAPID_PUBLIC_KEY para ativar notificacoes push.'
      );
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permissao de notificacao nao concedida.');
    }

    const registration = await getRegistration();
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      }));

    const serialized = serializeSubscription(subscription);
    if (!serialized.endpoint || !serialized.p256dh || !serialized.auth) {
      throw new Error('Navegador retornou uma subscription incompleta.');
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        membro_id: memberId,
        endpoint: serialized.endpoint,
        p256dh: serialized.p256dh,
        auth: serialized.auth,
        user_agent: navigator.userAgent,
        ativo: true,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'membro_id,endpoint' }
    );

    if (error) throw error;
    return subscription;
  },

  async disable(memberId: string) {
    const subscription = await this.getCurrentSubscription();

    if (subscription) {
      const serialized = serializeSubscription(subscription);
      await supabase
        .from('push_subscriptions')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('membro_id', memberId)
        .eq('endpoint', serialized.endpoint);
      await subscription.unsubscribe();
    }
  },

  async sendTest() {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        title: 'Valentes Connected',
        body: 'Notificacoes push ativadas com sucesso.',
        url: '/#/app'
      }
    });

    if (error) throw error;
    return data;
  }
};

export default PushNotificationService;
