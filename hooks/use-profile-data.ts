'use client';

import { useState, useEffect } from 'react';

import { authenticatedFetch, isAuthenticated } from '@/lib/auth-client';

export interface Partner {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  age: number | '';
  cycleLength: number | '';
  periodLength: number | '';
  periodDuration: number | '';
  menopauseStage: 'regular' | 'irregular' | 'perimenopause' | 'menopause';
}

export function useProfileData() {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [partners, setPartnersState] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from API
  useEffect(() => {
    async function loadProfileData() {
      try {
        if (!isAuthenticated()) {
          return;
        }

        const response = await authenticatedFetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setProfileState({
            name: data.name || '',
            email: data.email || '',
            age: data.age || '',
            cycleLength: data.cycleLength || 28,
            periodLength: data.periodLength || data.periodDuration || 5,
            periodDuration: data.periodDuration || 5,
            menopauseStage: data.menopauseStage || 'regular',
          });
          setPartnersState(
            data.partners?.map((p: any) => ({
              id: p.id,
              name: p.name,
              email: p.email,
              createdAt: p.createdAt,
            })) || []
          );
        }
      } catch (error) {
        if (!(error instanceof Error && error.message === 'Not authenticated')) {
          console.error('Error loading profile:', error);
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, []);

  const updateProfile = async (updatedProfile: UserProfile) => {
    try {
      const response = await authenticatedFetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedProfile.name,
          email: updatedProfile.email,
          age: updatedProfile.age === '' ? null : updatedProfile.age,
          cycleLength: updatedProfile.cycleLength,
          periodLength: updatedProfile.periodLength,
          periodDuration: updatedProfile.periodDuration,
          menopauseStage: updatedProfile.menopauseStage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileState({
          name: data.name || '',
          email: data.email || '',
          age: data.age || '',
          cycleLength: data.cycleLength || 28,
          periodLength: data.periodLength || data.periodDuration || 5,
          periodDuration: data.periodDuration || 5,
          menopauseStage: data.menopauseStage || 'regular',
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const addPartner = async (name: string, email: string, password: string): Promise<Partner> => {
    try {
      const response = await authenticatedFetch('/api/partner/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await response.json();

      if (response.ok) {
        const partner: Partner = {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          createdAt: payload.createdAt,
        };
        setPartnersState((prev) => [partner, ...prev]);
        return partner;
      }
      throw new Error(payload.error || 'Failed to add partner');
    } catch (error) {
      console.error('Error adding partner:', error);
      throw error;
    }
  };

  const deletePartner = async (partnerId: string) => {
    try {
      const response = await authenticatedFetch(`/api/partners/${partnerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPartnersState((prev) => prev.filter((p) => p.id !== partnerId));
      } else {
        throw new Error('Failed to delete partner');
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      throw error;
    }
  };

  return {
    profile,
    partners,
    loading,
    updateProfile,
    addPartner,
    deletePartner,
  };
}
