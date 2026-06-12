import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { HolidayService, Holiday } from '../../api/HolidayService';
import { useThemeColors } from '../../hooks/useThemeColors';

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
  const colors = useThemeColors();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    const fetchHolidays = async () => {
      const currentYear = new Date().getFullYear();
      const data = await HolidayService.getHolidays(currentYear); // Dynamic year
      setHolidays(data);
      
      const marked: any = {};
      data.forEach(h => {
        // Formatear fecha: YYYY-MM-DD (asegurando ceros a la izquierda)
        const dayStr = h.dia < 10 ? `0${h.dia}` : `${h.dia}`;
        const monthStr = h.mes < 10 ? `0${h.mes}` : `${h.mes}`;
        const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
        
        marked[dateKey] = {
          marked: true,
          dotColor: colors.error,
        };
      });
      setMarkedDates(marked);
    };

    fetchHolidays();
  }, [colors.error]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.black }]}>Calendario de Actividades</Text>
        <Calendar
          key={colors.isDark ? 'dark-calendar' : 'light-calendar'} // Forza la recreación del calendario al cambiar el tema para evitar retención de caché
          theme={{
            calendarBackground: colors.white,
            textSectionTitleColor: colors.primary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.white,
            todayTextColor: colors.secondary,
            dayTextColor: colors.black,
            textDisabledColor: colors.lightGray,
            arrowColor: colors.primary,
            monthTextColor: colors.primary,
            indicatorColor: colors.primary,
          }}
          markedDates={markedDates}
          onDayPress={(day: any) => {
            console.log('Selected day', day);
          }}
        />
        <View style={[styles.legend, { backgroundColor: colors.white }]}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <Text style={[styles.legendText, { color: colors.gray }]}>Feriado Argentina</Text>
          </View>
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  legend: {
    marginTop: 20,
    padding: 15,
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
  }
});

export default AdminCalendar;
