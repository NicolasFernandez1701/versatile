import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, FlatList } from 'react-native';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import TeacherCard from '../../components/TeacherCard';
import { supabase } from '../../api/supabaseClient';
import { Search } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*, classes:classes(count)')
      .eq('role', 'teacher');
    
    if (error) {
      console.error('Error fetching teachers:', error);
    } else {
      setTeachers(data || []);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Staff de Profesoras</Text>
          <Text style={styles.subtitle}>Gestiona el equipo y sus comisiones</Text>
        </View>

        <TextInput
          placeholder="Buscar profesora..."
          mode="outlined"
          left={<TextInput.Icon icon={() => <Search size={20} color={COLORS.gray} />} />}
          style={styles.searchBar}
          outlineColor={COLORS.lightGray}
          activeOutlineColor={COLORS.primary}
        />

        <FlatList
          data={teachers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TeacherCard 
              name={item.full_name} 
              classesCount={item.classes?.[0]?.count || 0} 
              onPress={() => console.log('Edit teacher', item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
};

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
});

export default TeacherManagement;
