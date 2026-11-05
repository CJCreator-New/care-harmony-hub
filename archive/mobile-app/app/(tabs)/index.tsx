import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();

  const quickActions = [
    { title: 'Book Appointment', icon: 'calendar-outline', color: '#3b82f6' },
    { title: 'View Reports', icon: 'document-text-outline', color: '#10b981' },
    { title: 'Prescriptions', icon: 'medical-outline', color: '#f59e0b' },
    { title: 'Emergency', icon: 'alert-circle-outline', color: '#ef4444' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.full_name || 'Patient'}</Text>
        <Text style={styles.subtitle}>How can we help you today?</Text>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionCard}>
              <Ionicons name={action.icon as any} size={32} color={action.color} />
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.upcomingSection}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentDate}>Tomorrow, 10:00 AM</Text>
            <Text style={styles.appointmentDoctor}>Dr. Sarah Johnson</Text>
            <Text style={styles.appointmentType}>General Consultation</Text>
          </View>
          <TouchableOpacity style={styles.appointmentAction}>
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.healthTips}>
        <Text style={styles.sectionTitle}>Health Tips</Text>
        <View style={styles.tipCard}>
          <Ionicons name="water-outline" size={24} color="#3b82f6" />
          <Text style={styles.tipText}>Remember to drink 8 glasses of water daily</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  upcomingSection: {
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  appointmentDoctor: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 2,
  },
  appointmentType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  appointmentAction: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  healthTips: {
    padding: 20,
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});