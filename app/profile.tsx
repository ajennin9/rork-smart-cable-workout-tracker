import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Edit2, ArrowLeft } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import Colors from '@/constants/colors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/hooks/auth-context';
import { useWorkout } from '@/hooks/workout-context';

export default function ProfileScreen() {
  const { user, signOut, updateProfile } = useAuth();
  const { workoutHistory } = useWorkout();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [nickname, setNickname] = useState(user?.nickname || '');

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      displayName,
      nickname,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.displayName || '');
    setNickname(user?.nickname || '');
    setIsEditing(false);
  };

  const totalWorkouts = workoutHistory.length;
  const totalVolume = workoutHistory.reduce((sum, workout) => 
    sum + (workout.totalVolume || 0), 0);
  const totalSets = workoutHistory.reduce((sum, workout) => 
    sum + (workout.totalSets || 0), 0);

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Profile',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <User size={48} color={Colors.surface} />
            </View>
            <Text style={styles.name}>{user?.displayName || 'User'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Lifetime Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalWorkouts}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalSets}</Text>
                <Text style={styles.statLabel}>Total Sets</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {(totalVolume / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.statLabel}>Total kg</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Settings</Text>
              {!isEditing && (
                <Button
                  title="Edit"
                  onPress={() => setIsEditing(true)}
                  variant="outline"
                  size="small"
                />
              )}
            </View>

            {isEditing ? (
              <View style={styles.editForm}>
                <Input
                  label="Display Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your display name"
                />
                <Input
                  label="Nickname (Optional)"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Enter a nickname"
                />
                <View style={styles.editActions}>
                  <Button
                    title="Save"
                    onPress={handleSaveProfile}
                    variant="primary"
                    size="medium"
                    style={styles.saveButton}
                  />
                  <Button
                    title="Cancel"
                    onPress={handleCancelEdit}
                    variant="outline"
                    size="medium"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.profileInfo}>
                <View style={styles.infoRow}>
                  <User size={20} color={Colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Display Name</Text>
                    <Text style={styles.infoValue}>{user?.displayName}</Text>
                  </View>
                </View>
                
                <View style={styles.infoRow}>
                  <Mail size={20} color={Colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email}</Text>
                  </View>
                </View>

                {user?.nickname && (
                  <View style={styles.infoRow}>
                    <Edit2 size={20} color={Colors.textSecondary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Nickname</Text>
                      <Text style={styles.infoValue}>{user.nickname}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Button
              title="Sign Out"
              onPress={handleLogout}
              variant="danger"
              size="large"
              style={styles.logoutButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  profileInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  editForm: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
  },
  logoutButton: {
    width: '100%',
  },
});