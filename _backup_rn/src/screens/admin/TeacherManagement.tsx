import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import TeacherCard from '../../components/TeacherCard';
import { supabase } from '../../api/supabaseClient';
import { Search, UserPlus } from 'lucide-react-native';
import { TextInput, Button } from 'react-native-paper';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { Title } from 'react-native-paper';

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
    <ThemeContainer scrollable={false}>
      <View style={styles.header}>
        <View>
          <Title style={[styles.title, { color: colors.black }]}>Staff de Profesoras</Title>
          <Text style={[styles.subtitle, { color: colors.gray }]}>Gestioná el equipo y sus comisiones</Text>
        </View>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('RegisterUser')}
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
            onPress={() => navigation.navigate('EditUserProfile', { userId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: colors.gray }}>No hay profesoras registradas.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchTeachers}
      />
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
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
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
});

export default TeacherManagement;
