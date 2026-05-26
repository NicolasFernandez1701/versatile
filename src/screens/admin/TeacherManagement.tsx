import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherCard from '../../components/TeacherCard';
import { supabase } from '../../api/supabaseClient';
import { Search, UserPlus } from 'lucide-react-native';
import { TextInput, Button } from 'react-native-paper';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useNavigation, useIsFocused } from '@react-navigation/native';

const TeacherManagement = () => {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchTeachers();
    }
  }, [isFocused]);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.title, { color: colors.black }]}>Staff de Profesoras</Text>
            <Text style={[styles.subtitle, { color: colors.gray }]}>Gestiona el equipo y sus comisiones</Text>
          </View>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('RegisterTeacher')}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            icon={() => <UserPlus size={18} color="#FFFFFF" />}
            labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
            style={{ borderRadius: 8, alignSelf: 'center' }}
          >
            Agregar
          </Button>
        </View>

        <TextInput
          placeholder="Buscar profesora..."
          placeholderTextColor={colors.gray}
          mode="outlined"
          left={<TextInput.Icon icon={() => <Search size={20} color={colors.gray} />} />}
          style={[styles.searchBar, { backgroundColor: colors.white }]}
          outlineColor={colors.lightGray}
          activeOutlineColor={colors.primary}
          textColor={colors.black}
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
  },
  container: {
    flex: 1,
    padding: 20,
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
});

export default TeacherManagement;
