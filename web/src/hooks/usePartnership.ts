import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnershipApi } from '../api/partnership';
import { useAuthStore } from '../store/authStore';
import { UpdatePartnershipSettingsInput } from '@dit/shared';
import toast from 'react-hot-toast';

export const usePartnership = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const { data: partnership, isLoading } = useQuery({
    queryKey: ['partnership'],
    queryFn: async () => {
      const p = await partnershipApi.get();
      if (p) {
        // The room is the source of truth for prayer tracking, so keep the
        // local user in sync even if the /me response is temporarily stale.
        const updates: { partnershipId?: string; prayerEnabled?: boolean } = {};
        if (user?.partnershipId !== p.id) updates.partnershipId = p.id;
        if (user?.prayerEnabled !== p.prayerEnabled) updates.prayerEnabled = p.prayerEnabled;
        if (Object.keys(updates).length > 0) updateUser(updates);
      } else if (user?.partnershipId || user?.prayerEnabled) {
        // A dissolved room may have been missed while offline or in another tab.
        updateUser({ partnershipId: null, prayerEnabled: false });
      }
      return p;
    },
    enabled: !!user,
  });

  const invite = useMutation({
    mutationFn: partnershipApi.invite,
    onSuccess: (data) => {
      updateUser({
        partnershipId: data.partnership.id,
        prayerEnabled: data.partnership.prayerEnabled
      });
      queryClient.setQueryData(['partnership'], data.partnership);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Invite code generated!');
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate invite');
    },
  });

  const join = useMutation({
    mutationFn: (data: { inviteCode: string }) => partnershipApi.join(data),
    onSuccess: (partnership) => {
      // Inherit the creator's room settings immediately — no prayer question
      // for the joining partner.
      updateUser({
        partnershipId: partnership.id,
        prayerEnabled: partnership.prayerEnabled
      });
      // The old pending room's tasks/calendar must never flash in the new room.
      ['commonTasks', 'dailyTasks', 'todos', 'prayers', 'calendar'].forEach((key) =>
        queryClient.removeQueries({ queryKey: [key] })
      );
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Successfully joined partnership!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to join partnership');
    },
  });

  const updateSettings = useMutation({
    mutationFn: (data: UpdatePartnershipSettingsInput) => partnershipApi.updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['partnership'], updated);
      updateUser({
        partnershipId: updated.id,
        prayerEnabled: updated.prayerEnabled
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(updated.prayerEnabled ? 'Prayer tracking enabled' : 'Prayer tracking disabled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update room settings');
    },
  });

  const leave = useMutation({
    mutationFn: partnershipApi.leave,
    onSuccess: () => {
      updateUser({ partnershipId: null, prayerEnabled: false });
      queryClient.setQueryData(['partnership'], null);
      // Remove cached queries without clearing in-flight mutations.
      queryClient.removeQueries();
      toast.success('Partnership dissolved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to dissolve partnership');
    },
  });

  // Determine the partner info from the partnership
  const partner = partnership
    ? partnership.user1Id === user?.id
      ? partnership.user2
      : partnership.user1
    : null;

  return {
    partnership,
    partner,
    isLoading,
    invite,
    join,
    updateSettings,
    leave,
  };
};
