'use client';

import { useState, useEffect } from 'react';

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

const PROFILE_STORAGE_KEY = 'user_profile';
const PARTNERS_STORAGE_KEY = 'user_partners';

export function useProfileData() {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [partners, setPartnersState] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    const storedPartners = localStorage.getItem(PARTNERS_STORAGE_KEY);

    if (storedProfile) {
      try {
        setProfileState(JSON.parse(storedProfile));
      } catch (error) {
        console.error('Error parsing profile:', error);
      }
    } else {
      // Default profile from signup or existing user
      const existingUser = localStorage.getItem('current_user');
      if (existingUser) {
        try {
          const user = JSON.parse(existingUser);
          setProfileState({
            name: user.name || '',
            email: user.email || '',
            age: user.age || '',
            cycleLength: user.cycleLength || 28,
            periodDuration: user.periodDuration || 5,
          });
        } catch (error) {
          console.error('Error parsing user data:', error);
          setProfileState({
            name: '',
            email: '',
            age: '',
            cycleLength: 28,
            periodDuration: 5,
          });
        }
      } else {
        setProfileState({
          name: '',
          email: '',
          age: '',
          cycleLength: 28,
          periodDuration: 5,
        });
      }
    }

    if (storedPartners) {
      try {
        setPartnersState(JSON.parse(storedPartners));
      } catch (error) {
        console.error('Error parsing partners:', error);
      }
    }

    setLoading(false);
  }, []);

  const updateProfile = (updatedProfile: UserProfile) => {
    setProfileState(updatedProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    // Also update current_user for consistency
    localStorage.setItem(
      'current_user',
      JSON.stringify({
        ...updatedProfile,
        id: localStorage.getItem('current_user')
          ? JSON.parse(localStorage.getItem('current_user')!).id
          : 'user_1',
      })
    );
  };

  const addPartner = (name: string, phone: string): Partner => {
    const newPartner: Partner = {
      id: `partner_${Date.now()}`,
      name,
      phone,
      addedDate: new Date().toISOString(),
    };
    const updatedPartners = [...partners, newPartner];
    setPartnersState(updatedPartners);
    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(updatedPartners));
    return newPartner;
  };

  const deletePartner = (partnerId: string) => {
    const updatedPartners = partners.filter((p) => p.id !== partnerId);
    setPartnersState(updatedPartners);
    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(updatedPartners));
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
