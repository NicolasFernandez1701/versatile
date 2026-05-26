import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboard';
import AdminCalendarScreen from '../screens/admin/AdminCalendar';
import TeacherManagementScreen from '../screens/admin/TeacherManagement';
import ClassManagementScreen from '../screens/admin/ClassManagement';
import AddClassScreen from '../screens/admin/AddClassScreen';
import EditClassScreen from '../screens/admin/EditClassScreen';
import StudentManagementScreen from '../screens/admin/StudentManagement';
import EnrollStudentScreen from '../screens/admin/EnrollStudentScreen';
import RecordPaymentScreen from '../screens/admin/RecordPaymentScreen';
import FinancialReportsScreen from '../screens/admin/FinancialReports';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboard';
import AttendanceScreen from '../screens/teacher/AttendanceScreen';
import StudentDashboardScreen from '../screens/student/StudentDashboard';
import PlansManagementScreen from '../screens/admin/PlansManagement';
import AuthScreen from '../screens/auth/AuthScreen';
import RegisterStudentScreen from '../screens/admin/RegisterStudentScreen';
import RegisterTeacherScreen from '../screens/admin/RegisterTeacherScreen';
import { supabase } from '../api/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { COLORS } from '../theme/colors';
import { Calendar, User, BarChart, Users, CheckSquare } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View, Image } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Componente para renderizar el logo en blanco en el margen superior derecho de la barra de navegación nativa
const HeaderLogo = () => (
  <Image 
    source={require('../../assets/logo.png')} 
    style={{ width: 24, height: 24, marginRight: 15, tintColor: '#FFFFFF' }}
    resizeMode="contain"
  />
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerRight: () => <HeaderLogo />,
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={AdminDashboardScreen} 
      options={{ title: 'Panel de Control', tabBarIcon: ({ color }) => <BarChart color={color} size={24} /> }}
    />
    <Tab.Screen 
      name="Staff" 
      component={TeacherManagementScreen} 
      options={{ title: 'Profesores', tabBarIcon: ({ color }) => <Users color={color} size={24} /> }}
    />
    <Tab.Screen 
      name="Calendar" 
      component={AdminCalendarScreen} 
      options={{ title: 'Calendario', tabBarIcon: ({ color }) => <Calendar color={color} size={24} /> }}
    />
    <Tab.Screen 
      name="Perfil" 
      component={ProfileScreen} 
      options={{ title: 'Mi Perfil', tabBarIcon: ({ color }) => <User color={color} size={24} /> }}
    />
  </Tab.Navigator>
);

const TeacherTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerRight: () => <HeaderLogo />,
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={TeacherDashboardScreen} 
      options={{ title: 'Mi Agenda', tabBarIcon: ({ color }) => <BarChart color={color} size={24} /> }}
    />
    <Tab.Screen 
      name="Asistencia" 
      component={AttendanceScreen} 
      options={{ title: 'Tomar Asistencia', tabBarIcon: ({ color }) => <CheckSquare color={color} size={24} /> }}
    />
  </Tab.Navigator>
);

const AdminStack = createNativeStackNavigator();

const AdminStackScreen = () => (
  <AdminStack.Navigator 
    screenOptions={{ 
      headerShown: true,
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerRight: () => <HeaderLogo />,
    }}
  >
    <AdminStack.Screen 
      name="AdminTabs" 
      component={AdminTabs} 
      options={{ headerShown: false }} // Mantenemos el header del stack oculto aquí para evitar cabecera doble en los tabs
    />
    <AdminStack.Screen name="ClassManagement" component={ClassManagementScreen} options={{ title: 'Gestión de Clases' }} />
    <AdminStack.Screen name="AddClass" component={AddClassScreen} options={{ title: 'Agregar Clase' }} />
    <AdminStack.Screen name="EditClass" component={EditClassScreen} options={{ title: 'Editar Clase' }} />
    <AdminStack.Screen name="StudentManagement" component={StudentManagementScreen} options={{ title: 'Gestión de Alumnos' }} />
    <AdminStack.Screen name="EnrollStudent" component={EnrollStudentScreen} options={{ title: 'Inscribir Alumno' }} />
    <AdminStack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: 'Registrar Pago' }} />
    <AdminStack.Screen name="FinancialReports" component={FinancialReportsScreen} options={{ title: 'Reportes Financieros' }} />
    <AdminStack.Screen name="PlanManagement" component={PlansManagementScreen} options={{ title: 'Gestión de Planes' }} />
    <AdminStack.Screen name="RegisterStudent" component={RegisterStudentScreen} options={{ title: 'Registrar Alumno' }} />
    <AdminStack.Screen name="RegisterTeacher" component={RegisterTeacherScreen} options={{ title: 'Registrar Profesora' }} />
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
        <Stack.Screen name="TeacherMain" component={TeacherTabs} />
      ) : (
        <Stack.Screen 
          name="StudentMain" 
          component={StudentDashboardScreen} 
          options={{ 
            headerShown: true, 
            title: 'Mi Cuenta',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: COLORS.white,
            headerRight: () => <HeaderLogo />
          }} 
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
