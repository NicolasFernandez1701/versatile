import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import StudentCard from '../../components/StudentCard';
import { supabase } from '../../api/supabaseClient';
import { Search, UserPlus } from 'lucide-react-native';
import { TextInput, Title, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const StudentManagement = () => {
  const navigation = useNavigation<any>();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // Fetch students and their latest payment
    const { data, error } = await supabase
      .from('profiles')
      .select('*, payments(plan_details, expiration_date)')
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
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Title style={styles.title}>Alumnos</Title>
            <Text style={styles.subtitle}>Control de planes y pagos</Text>
          </View>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('EnrollStudent')}
            buttonColor={COLORS.primary}
            icon={() => <UserPlus size={18} color={COLORS.white} />}
          >
            Inscribir
          </Button>
        </View>

        <TextInput
          placeholder="Buscar alumno..."
          mode="outlined"
          left={<TextInput.Icon icon={() => <Search size={20} color={COLORS.gray} />} />}
          style={styles.searchBar}
          outlineColor={COLORS.lightGray}
          activeOutlineColor={COLORS.primary}
        />

        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StudentCard 
              name={item.full_name} 
              plan={item.payments?.[0]?.plan_details || 'Sin Plan'} 
              status={getStatus(item.payments?.[0]?.expiration_date)}
              onPress={() => console.log('Student details', item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay alumnos registrados.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

// Re-using Title from paper (already imported)

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  searchBar: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
  },
  list: {
    paddingBottom: 20,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
  }
});

export default StudentManagement;
