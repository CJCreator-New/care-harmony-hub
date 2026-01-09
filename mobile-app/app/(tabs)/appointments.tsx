import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function AppointmentsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const appointments = [
    {
      id: '1',
      date: '2024-12-21',
      time: '10:00 AM',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'General Medicine',
      status: 'confirmed',
      type: 'consultation',
    },
    {
      id: '2',
      date: '2024-12-25',
      time: '2:30 PM',
      doctor: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      status: 'pending',
      type: 'follow-up',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {appointments.map((appointment) => (
          <View key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <View style={styles.dateTime}>
                <Text style={styles.date}>{appointment.date}</Text>
                <Text style={styles.time}>{appointment.time}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: appointment.status === 'confirmed' ? '#10b981' : '#f59e0b' }
              ]}>
                <Text style={styles.statusText}>{appointment.status}</Text>
              </View>
            </View>
            
            <View style={styles.appointmentDetails}>
              <Text style={styles.doctorName}>{appointment.doctor}</Text>
              <Text style={styles.specialty}>{appointment.specialty}</Text>
              <Text style={styles.appointmentType}>{appointment.type}</Text>
            </View>

            <View style={styles.appointmentActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="videocam-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionText}>Join Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTime: {
    flex: 1,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  time: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  specialty: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 2,
  },
  appointmentType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
  },
});