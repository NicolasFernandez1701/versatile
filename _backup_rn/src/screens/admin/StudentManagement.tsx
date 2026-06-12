import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Search, UserPlus, Bookmark } from 'lucide-react-native';
import { TextInput, Title, Button } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../../api/supabaseClient';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';
import StudentCard from '../../components/StudentCard';

const StudentManagement = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const colors = useThemeColors();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchStudents();
    }
  }, [isFocused]);

  const fetchStudents = async () => {
    setLoading(true);
    // Fetch students and their latest payment
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans(name)')
      .eq('role', 'student');

    if (error) {
      console.error(error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const getStatus = (expirationDate?: string) => {
    if (!expirationDate) return 'Pendiente';
    const today = new Date();
    const exp = new Date(expirationDate);
    if (exp < today) return 'Vencido';
    return 'Al Día';
  };

  return (
    <ThemeContainer scrollable={false}>
      <View style={styles.header}>
        <View>
          <Title style={[styles.title, { color: colors.black }]}>Alumnos</Title>
          <Text style={[styles.subtitle, { color: colors.gray }]}>Control de planes y pagos</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('RegisterUser')}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
          icon={() => <UserPlus size={18} color="#FFFFFF" />}
          style={styles.actionButton}
          labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
        >
          Registrar Alumno
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => navigation.navigate('EnrollStudent')}
          textColor={colors.primary}
          icon={() => <Bookmark size={18} color={colors.primary} />}
          style={[styles.actionButton, { borderColor: colors.primary }]}
          labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
        >
          Inscribir Clase
        </Button>
      </View>

      <TextInput
        placeholder="Buscar alumno..."
        placeholderTextColor={colors.gray}
        mode="outlined"
        left={<TextInput.Icon icon={() => <Search size={20} color={colors.gray} />} />}
        style={[styles.searchBar, { backgroundColor: colors.white }]}
        outlineColor={colors.lightGray}
        activeOutlineColor={colors.primary}
        textColor={colors.black}
      />

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StudentCard 
            name={item.full_name} 
            plan={item.plans?.name || 'Sin Plan'} 
            status={getStatus(item.plan_expiration_date)}
            phone={item.phone}
            email={item.email}
            onPress={() => navigation.navigate('EditUserProfile', { userId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: colors.gray }}>No hay alumnos registrados.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchStudents}
      />
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchBar: {
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
});

export default StudentManagement;
