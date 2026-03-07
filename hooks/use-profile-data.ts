'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth-client';

export interface Partner {
  id: string;
  name: string;
  phone: string;
  addedDate: string;
}

export interface UserProfile {
  name: string;
  email: string;
  age: number | '';
  cycleLength: number | '';
  periodDuration: number | '';
}

export function useProfileData() {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [partners, setPartnersState] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from API
  useEffect(() => {
    async function loadProfileData() {
      try {
        const response = await authenticatedFetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setProfileState({
            name: data.name || '',
            email: data.email || '',
            age: data.age || '',
            cycleLength: data.cycleLength || 28,
            periodDuration: data.periodDuration || 5,
          });
          setPartnersState(
            data.partners?.map((p: any) => ({
              id: p.id,
              name: p.name,
              phone: p.phone,
              addedDate: p.addedDate,
            })) || []
          );
        }
      } catch (error) {
        console.error('Error loading profile:', error);
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
          periodDuration: updatedProfile.periodDuration,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileState({
          name: data.name || '',
          email: data.email || '',
          age: data.age || '',
          cycleLength: data.cycleLength || 28,
          periodDuration: data.periodDuration || 5,
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const addPartner = async (name: string, phone: string): Promise<Partner> => {
    try {
      const response = await authenticatedFetch('/api/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone }),
      });

      if (response.ok) {
        const newPartner = await response.json();
        const partner: Partner = {
          id: newPartner.id,
          name: newPartner.name,
          phone: newPartner.phone,
          addedDate: newPartner.addedDate,
        };
        setPartnersState((prev) => [...prev, partner]);
        return partner;
      }
      throw new Error('Failed to add partner');
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
