import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LoginScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>CareSync Mobile</Text>
    <Text style={styles.subtitle}>Login Screen</Text>
  </View>
);

export const PatientsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Patients</Text>
    <Text style={styles.subtitle}>Patient management</Text>
  </View>
);

export const TasksScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Tasks</Text>
    <Text style={styles.subtitle}>Task management</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
});

export default { LoginScreen, PatientsScreen, TasksScreen };