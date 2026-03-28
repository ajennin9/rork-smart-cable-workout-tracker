import React from 'react';
import {
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';

interface ExerciseInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function ExerciseAutocomplete({ 
  value, 
  onValueChange, 
  placeholder = "Type exercise name..." 
}: ExerciseInputProps) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onValueChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.textLight}
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="done"
      blurOnSubmit
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    // iOS specific styling
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    }),
  },
});