# Geracao do APK Android

Este projeto usa Capacitor para empacotar o app web React/Vite como aplicativo Android.

## Requisitos

- Android Studio instalado.
- Android SDK instalado.
- JDK 11 ou superior. No Android Studio, o JDK embutido fica normalmente em:
  `C:\Program Files\Android\Android Studio\jbr`

## Preparar o build Android

Na raiz do projeto:

```bash
npm run android:sync
```

Esse comando executa o build web e copia os arquivos gerados para o projeto Android.

## Abrir no Android Studio

```bash
npm run android:open
```

Depois use o Android Studio para testar em emulador ou celular conectado.

## Gerar APK debug pelo terminal

No PowerShell, dentro da pasta `android`, use o JDK do Android Studio:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```

O APK debug fica em:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## Observacoes

- O arquivo `android/local.properties` aponta para o SDK local e nao deve ser versionado.
- Para publicar ou instalar fora do modo debug, ainda e necessario configurar assinatura de release.
- Sempre rode `npm run android:sync` antes de gerar um novo APK, para garantir que o Android recebeu a versao mais recente do app web.
