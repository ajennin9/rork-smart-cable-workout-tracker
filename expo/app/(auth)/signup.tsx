import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import Colors from '@/constants/colors';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !displayName) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await signUp(email, password, displayName);
      router.replace('/(tabs)');
    } catch (err) {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start tracking your workouts today</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Display Name"
              placeholder="Enter your name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              size="large"
              style={styles.button}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 48,
    marginTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  button: {
    marginTop: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});