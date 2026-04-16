export interface ActiveRowLike {
  ativo?: boolean | null;
}

export interface MembershipLike extends ActiveRowLike {
  id?: string;
  membro_id: string;
  ministerio_id: string;
  principal?: boolean | null;
  papel?: string | null;
}

export interface MemberLike extends ActiveRowLike {
  id: string;
}

interface MembershipFilterOptions {
  ministerioId?: string | null;
  includeInactive?: boolean;
}

export const isActiveRow = (row?: ActiveRowLike | null) => row?.ativo !== false;

export const getMemberMemberships = <T extends MembershipLike>(
  memberships: T[] | null | undefined,
  memberId: string,
  options?: MembershipFilterOptions
): T[] => {
  const { ministerioId = null, includeInactive = true } = options || {};

  return (memberships || []).filter((membership) => {
    if (membership.membro_id !== memberId) {
      return false;
    }

    if (ministerioId && membership.ministerio_id !== ministerioId) {
      return false;
    }

    if (!includeInactive && !isActiveRow(membership)) {
      return false;
    }

    return true;
  });
};

export const getMembershipForMemberInMinisterio = <T extends MembershipLike>(
  memberships: T[] | null | undefined,
  memberId: string,
  ministerioId?: string | null,
  includeInactive = true
): T | null =>
  getMemberMemberships(memberships, memberId, {
    ministerioId,
    includeInactive
  })[0] || null;

export const getMemberIdsForMinisterio = <T extends MembershipLike>(
  memberships: T[] | null | undefined,
  ministerioId?: string | null,
  includeInactive = false
) =>
  new Set(
    (memberships || [])
      .filter((membership) => {
        if (ministerioId && membership.ministerio_id !== ministerioId) {
          return false;
        }

        if (!includeInactive && !isActiveRow(membership)) {
          return false;
        }

        return true;
      })
      .map((membership) => membership.membro_id)
  );

export const isMemberActiveInMinisterio = (
  member?: MemberLike | null,
  membership?: MembershipLike | null
) => isActiveRow(member) && isActiveRow(membership);
