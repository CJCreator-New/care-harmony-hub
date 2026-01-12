import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VoiceCommandManager } from '../services/VoiceCommands';
import { OfflineSyncManager } from '../services/OfflineSync';

const DashboardScreen = () => {
  const [stats, setStats] = useState({
    pendingTasks: 5,
    todayAppointments: 12,
    waitingPatients: 3,
    unreadMessages: 2
  });
  
  const voiceManager = new VoiceCommandManager();
  const syncManager = new OfflineSyncManager();
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    // Try to load from cache first
    const cachedData = await syncManager.getCachedData('dashboard_stats');
    if (cachedData) {
      setStats(cachedData);
    }
    
    // Then fetch fresh data
    // fetchDashboardStats();
  };
  
  const startVoiceCommand = () => {
    voiceManager.startListening();
    Alert.alert('Voice Command', 'Listening... Say a command');
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity onPress={startVoiceCommand} style={styles.voiceButton}>
          <Icon name="mic" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="assignment" size={32} color="#3B82F6" />
          <Text style={styles.statNumber}>{stats.pendingTasks}</Text>
          <Text style={styles.statLabel}>Pending Tasks</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="event" size={32} color="#10B981" />
          <Text style={styles.statNumber}>{stats.todayAppointments}</Text>
          <Text style={styles.statLabel}>Today's Appointments</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="people" size={32} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.waitingPatients}</Text>
          <Text style={styles.statLabel}>Waiting Patients</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="message" size={32} color="#EF4444" />
          <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Unread Messages</Text>
        </View>
      </View>
      
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="person-add" size={24} color="#3B82F6" />
          <Text style={styles.actionText}>Register Patient</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="event-note" size={24} color="#10B981" />
          <Text style={styles.actionText}>Schedule Appointment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="emergency" size={24} color="#EF4444" />
          <Text style={styles.actionText}>Emergency Alert</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  voiceButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 25,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    margin: '1%',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
});

export default DashboardScreen;