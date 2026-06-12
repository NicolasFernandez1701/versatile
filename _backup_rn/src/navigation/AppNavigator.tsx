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
import RegisterUserScreen from '../screens/admin/RegisterUserScreen';
import EditUserProfileScreen from '../screens/admin/EditUserProfileScreen';
import { COLORS } from '../theme/colors';
import { Calendar, User, BarChart, Users, CheckSquare } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';

// Pantalla de fallback cuando la sesión existe pero el perfil no se pudo cargar
const NoProfileScreen = () => {
  const { signOut } = useAuthStore();
  return (
    <View style={noProfileStyles.container}>
      <Text style={noProfileStyles.title}>No se pudo cargar tu perfil</Text>
      <Text style={noProfileStyles.subtitle}>Cerrá sesión y volvé a ingresar.</Text>
      <TouchableOpacity style={noProfileStyles.button} onPress={signOut}>
        <Text style={noProfileStyles.buttonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const noProfileStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F5F5F5' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 30 },
  button: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
      options={{ headerShown: false }}
    />
    <AdminStack.Screen name="ClassManagement" component={ClassManagementScreen} options={{ title: 'Gestión de Clases' }} />
    <AdminStack.Screen name="AddClass" component={AddClassScreen} options={{ title: 'Agregar Clase' }} />
    <AdminStack.Screen name="EditClass" component={EditClassScreen} options={{ title: 'Editar Clase' }} />
    <AdminStack.Screen name="StudentManagement" component={StudentManagementScreen} options={{ title: 'Gestión de Alumnos' }} />
    <AdminStack.Screen name="EnrollStudent" component={EnrollStudentScreen} options={{ title: 'Inscribir Alumno' }} />
    <AdminStack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: 'Registrar Pago' }} />
    <AdminStack.Screen name="FinancialReports" component={FinancialReportsScreen} options={{ title: 'Reportes Financieros' }} />
    <AdminStack.Screen name="PlanManagement" component={PlansManagementScreen} options={{ title: 'Gestión de Planes' }} />
    {/* Ruta unificada de registro (reemplaza RegisterStudent y RegisterTeacher) */}
    <AdminStack.Screen name="RegisterUser" component={RegisterUserScreen} options={{ title: 'Registrar Usuario' }} />
    {/* Edición de perfil de cualquier usuario (accesible desde StudentManagement y TeacherManagement) */}
    <AdminStack.Screen name="EditUserProfile" component={EditUserProfileScreen} options={{ title: 'Editar Perfil' }} />
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

  // Sesión activa pero perfil no cargado → fallback con botón de cerrar sesión
  if (!profile) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="NoProfile" component={NoProfileScreen} />
      </Stack.Navigator>
    );
  }

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
            headerRight: () => <HeaderLogo />,
          }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
