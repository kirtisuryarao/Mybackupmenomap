'use client';

import { Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { LayoutWrapper } from '@/components/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfileData } from '@/hooks/use-profile-data';

export default function ProfilePage() {
  const { profile, partners, loading, updateProfile, addPartner, deletePartner } =
    useProfileData();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    cycleLength: 28,
    periodLength: 5,
    menopauseStage: 'regular' as 'regular' | 'irregular' | 'perimenopause' | 'menopause',
  });
  const [partnerForm, setPartnerForm] = useState({ name: '', email: '', password: '' });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addingPartnerLoading, setAddingPartnerLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        age: profile.age === '' ? '' : String(profile.age),
        cycleLength: profile.cycleLength === '' ? 28 : Number(profile.cycleLength),
        periodLength: profile.periodLength === '' ? 5 : Number(profile.periodLength),
        menopauseStage: profile.menopauseStage,
      });
    }
  }, [profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.age !== '' && (Number(formData.age) < 1 || Number(formData.age) > 120)) {
      newErrors.age = 'Age must be between 1 and 120';
    }
    if (formData.cycleLength < 21 || formData.cycleLength > 35) {
      newErrors.cycleLength = 'Cycle length should be between 21 and 35 days';
    }
    if (formData.periodLength < 1 || formData.periodLength > 15) {
      newErrors.periodLength = 'Period length should be between 1 and 15 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePartnerForm = () => {
    const newErrors: Record<string, string> = {};

    if (!partnerForm.name.trim()) {
      newErrors.partnerName = 'Partner name is required';
    }
    if (!partnerForm.email.trim()) {
      newErrors.partnerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerForm.email)) {
      newErrors.partnerEmail = 'Invalid email format';
    }
    if (!partnerForm.password.trim()) {
      newErrors.partnerPassword = 'Password is required';
    } else if (partnerForm.password.length < 6) {
      newErrors.partnerPassword = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['cycleLength', 'periodLength', 'age'].includes(name)
        ? value === ''
          ? ''
          : Number(value)
        : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSaveProfile = () => {
    if (validateForm()) {
      updateProfile({
        name: formData.name,
        email: formData.email,
        age: formData.age === '' ? '' : Number(formData.age),
        cycleLength: Number(formData.cycleLength),
        periodLength: Number(formData.periodLength),
        periodDuration: Number(formData.periodLength),
        menopauseStage: formData.menopauseStage,
      });
      setIsEditing(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleAddPartner = async () => {
    if (validatePartnerForm()) {
      setAddingPartnerLoading(true);
      try {
        await addPartner(partnerForm.name, partnerForm.email, partnerForm.password);

        // Reset form
        setPartnerForm({ name: '', email: '', password: '' });
        setIsAddingPartner(false);
        setErrors({});
      } catch (error: any) {
        setErrors({ form: error?.message || 'An error occurred. Please try again.' });
      } finally {
        setAddingPartnerLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">My Profile</h1>

        {isSaved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700">Profile updated successfully!</p>
          </div>
        )}

        {/* Personal Information Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-primary">Personal & Health Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name</label>
                {isEditing ? (
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                ) : (
                  <p className="text-foreground py-2">{profile?.name || 'Not set'}</p>
                )}
                {errors.name && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                {isEditing ? (
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                ) : (
                  <p className="text-foreground py-2">{profile?.email || 'Not set'}</p>
                )}
                {errors.email && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Age</label>
                {isEditing ? (
                  <Input
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleInputChange}
                    className={errors.age ? 'border-red-500' : ''}
                  />
                ) : (
                  <p className="text-foreground py-2">{profile?.age || 'Not set'}</p>
                )}
                {errors.age && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Cycle Length */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Cycle Length (days)
                </label>
                {isEditing ? (
                  <Input
                    name="cycleLength"
                    type="number"
                    value={formData.cycleLength}
                    onChange={handleInputChange}
                    className={errors.cycleLength ? 'border-red-500' : ''}
                  />
                ) : (
                  <p className="text-foreground py-2">
                    {profile?.cycleLength || 28} days
                  </p>
                )}
                {errors.cycleLength && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.cycleLength}
                  </p>
                )}
              </div>

              {/* Period Length */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Period Length (days)
                </label>
                {isEditing ? (
                  <Input
                    name="periodLength"
                    type="number"
                    value={formData.periodLength}
                    onChange={handleInputChange}
                    className={errors.periodLength ? 'border-red-500' : ''}
                  />
                ) : (
                  <p className="text-foreground py-2">
                    {profile?.periodLength || profile?.periodDuration || 5} days
                  </p>
                )}
                {errors.periodLength && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.periodLength}
                  </p>
                )}
              </div>

              {/* Menopause Stage */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Menopause Stage</label>
                {isEditing ? (
                  <Select
                    value={formData.menopauseStage}
                    onValueChange={(value: 'regular' | 'irregular' | 'perimenopause' | 'menopause') =>
                      setFormData((prev) => ({ ...prev, menopauseStage: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">regular</SelectItem>
                      <SelectItem value="irregular">irregular</SelectItem>
                      <SelectItem value="perimenopause">perimenopause</SelectItem>
                      <SelectItem value="menopause">menopause</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground py-2 capitalize">{profile?.menopauseStage || 'regular'}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  This controls whether the app emphasizes cycle prediction or symptom-first tracking.
                </p>
              </div>

            </div>

            <div className="pt-4 flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-primary">
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleSaveProfile} className="bg-primary">
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setErrors({});
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Partner Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Partner Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Partners List */}
            {partners.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Your Partners
                </h3>
                <div className="space-y-3">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{partner.name}</p>
                        <p className="text-sm text-muted-foreground">{partner.email}</p>
                      </div>
                      <Button
                        onClick={() => deletePartner(partner.id)}
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {partners.length === 0 && !isAddingPartner && (
              <p className="text-muted-foreground text-sm">
                No partners added yet. Add a partner to share your health information.
              </p>
            )}

            {/* Add Partner Form */}
            {!isAddingPartner ? (
              <Button
                onClick={() => setIsAddingPartner(true)}
                className="bg-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Partner
              </Button>
            ) : (
              <div className="p-4 bg-secondary rounded-lg space-y-4">
                <h3 className="font-semibold text-foreground">Add New Partner</h3>

                {errors.form && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.form}
                  </p>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Partner Name
                  </label>
                  <Input
                    placeholder="Enter partner's name"
                    value={partnerForm.name}
                    onChange={(e) => {
                      setPartnerForm((prev) => ({ ...prev, name: e.target.value }));
                      if (errors.partnerName) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.partnerName;
                          return newErrors;
                        });
                      }
                    }}
                    className={errors.partnerName ? 'border-red-500' : ''}
                  />
                  {errors.partnerName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.partnerName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Partner Email ID
                  </label>
                  <Input
                    type="email"
                    placeholder="partner@example.com"
                    value={partnerForm.email}
                    onChange={(e) => {
                      setPartnerForm((prev) => ({ ...prev, email: e.target.value }));
                      if (errors.partnerEmail) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.partnerEmail;
                          return newErrors;
                        });
                      }
                    }}
                    className={errors.partnerEmail ? 'border-red-500' : ''}
                  />
                  {errors.partnerEmail && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.partnerEmail}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Create Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={partnerForm.password}
                    onChange={(e) => {
                      setPartnerForm((prev) => ({ ...prev, password: e.target.value }));
                      if (errors.partnerPassword) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.partnerPassword;
                          return newErrors;
                        });
                      }
                    }}
                    className={errors.partnerPassword ? 'border-red-500' : ''}
                  />
                  {errors.partnerPassword && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.partnerPassword}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleAddPartner} 
                    className="bg-primary"
                    disabled={addingPartnerLoading}
                  >
                    {addingPartnerLoading ? 'Adding...' : 'Save Partner'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingPartner(false);
                      setPartnerForm({ name: '', email: '', password: '' });
                      setErrors({});
                    }}
                    variant="outline"
                    disabled={addingPartnerLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </LayoutWrapper>
  );
}
