import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { HolidayService, Holiday } from '../../api/HolidayService';

// Configure Calendar to Spanish
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const AdminCalendar = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    const fetchHolidays = async () => {
      const data = await HolidayService.getHolidays(2026); // Current year
      setHolidays(data);
      
      const marked: any = {};
      data.forEach(h => {
        // Format: YYYY-MM-DD
        const month = h.mes < 10 ? `0${h.mes}` : h.mes;
        const day = h.dia < 10 ? `0${h.dia}` : h.dia;
        const dateString = `2026-${month}-${day}`;
        marked[dateString] = {
          marked: true,
          dotColor: COLORS.error,
          customStyles: {
            container: { backgroundColor: '#FFEBEE' },
            text: { color: COLORS.error, fontWeight: 'bold' }
          }
        };
      });
      setMarkedDates(marked);
    };

    fetchHolidays();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <View style={styles.container}>
        <Text style={styles.title}>Calendario de Actividades</Text>
        <Calendar
          theme={{
            calendarBackground: COLORS.white,
            textSectionTitleColor: COLORS.primary,
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor: COLORS.white,
            todayTextColor: COLORS.secondary,
            dayTextColor: COLORS.black,
            textDisabledColor: COLORS.lightGray,
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.primary,
            indicatorColor: COLORS.primary,
          }}
          markingType={'custom'}
          markedDates={markedDates}
          onDayPress={(day: any) => {
            console.log('Selected day', day);
          }}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.legendText}>Feriado Argentina</Text>
          </View>
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 20,
  },
  legend: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: COLORS.gray,
  }
});

export default AdminCalendar;
