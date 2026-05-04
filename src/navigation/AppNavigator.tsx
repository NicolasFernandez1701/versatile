import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboard';
import AdminCalendarScreen from '../screens/admin/AdminCalendar';
import TeacherManagementScreen from '../screens/admin/TeacherManagement';
import ClassManagementScreen from '../screens/admin/ClassManagement';
import AddClassScreen from '../screens/admin/AddClassScreen';
import StudentManagementScreen from '../screens/admin/StudentManagement';
import EnrollStudentScreen from '../screens/admin/EnrollStudentScreen';
import RecordPaymentScreen from '../screens/admin/RecordPaymentScreen';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboard';
import StudentDashboardScreen from '../screens/student/StudentDashboard';
import AuthScreen from '../screens/auth/AuthScreen';
import { supabase } from '../api/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { COLORS } from '../theme/colors';
import { Calendar, User, BarChart, Users } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={AdminDashboardScreen} 
      options={{ tabBarIcon: ({ color }) => <BarChart color={color} size={24} /> }}
    />
    <Tab.Screen 
      name="Staff" 
      component={TeacherManagementScreen} 
      options={{ tabBarIcon: ({ color }) => <Users color={color} size={24} /> }}
    />
    <Tab.Screen 
      name="Calendar" 
      component={AdminCalendarScreen} 
      options={{ tabBarIcon: ({ color }) => <Calendar color={color} size={24} /> }}
    />
  </Tab.Navigator>
);

const AdminStack = createNativeStackNavigator();

const AdminStackScreen = () => (
  <AdminStack.Navigator screenOptions={{ headerShown: false }}>
    <AdminStack.Screen name="AdminTabs" component={AdminTabs} />
    <AdminStack.Screen name="ClassManagement" component={ClassManagementScreen} />
    <AdminStack.Screen name="AddClass" component={AddClassScreen} />
    <AdminStack.Screen name="StudentManagement" component={StudentManagementScreen} />
    <AdminStack.Screen name="EnrollStudent" component={EnrollStudentScreen} />
    <AdminStack.Screen name="RecordPayment" component={RecordPaymentScreen} />
  </AdminStack.Navigator>
);

const AppNavigator = () => {
  const { session, profile, loading, initialize } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  const role = profile?.role;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role === 'admin' ? (
        <Stack.Screen name="AdminMain" component={AdminStackScreen} />
      ) : role === 'teacher' ? (
        <Stack.Screen name="TeacherMain" component={TeacherDashboardScreen} />
      ) : (
        <Stack.Screen name="StudentMain" component={StudentDashboardScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
