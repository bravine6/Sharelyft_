import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const renderQuickActions = () => {
    if (user?.user_type === 'driver') {
      return (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="car-outline" size={32} color="#10B981" />
            <Text style={styles.actionTitle}>Go Online</Text>
            <Text style={styles.actionSubtitle}>Start accepting rides</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="analytics-outline" size={32} color="#3B82F6" />
            <Text style={styles.actionTitle}>Earnings</Text>
            <Text style={styles.actionSubtitle}>View your income</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="location-outline" size={32} color="#10B981" />
          <Text style={styles.actionTitle}>Book Ride</Text>
          <Text style={styles.actionSubtitle}>Find a ride now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="time-outline" size={32} color="#F59E0B" />
          <Text style={styles.actionTitle}>Schedule</Text>
          <Text style={styles.actionSubtitle}>Plan ahead</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.first_name || user?.email?.split('@')[0]}!
            </Text>
            <Text style={styles.subGreeting}>
              {user?.user_type === 'driver' ? 'Ready to drive?' : 'Where to today?'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleLogout}
          >
            <Ionicons name="person-circle-outline" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {renderQuickActions()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <Ionicons 
                name={user?.email_verified ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color={user?.email_verified ? "#10B981" : "#F59E0B"} 
              />
              <Text style={styles.statusText}>
                Email {user?.email_verified ? 'Verified' : 'Not Verified'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Ionicons 
                name={user?.phone_verified ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color={user?.phone_verified ? "#10B981" : "#F59E0B"} 
              />
              <Text style={styles.statusText}>
                Phone {user?.phone_verified ? 'Verified' : 'Not Verified'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subGreeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
});

export default DashboardScreen;