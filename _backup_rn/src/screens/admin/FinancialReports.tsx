import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../../api/supabaseClient';
import { Title, Card, List, Divider, IconButton, SegmentedButtons, Portal, Modal, Button } from 'react-native-paper';
import { DollarSign, TrendingDown, PieChart } from 'lucide-react-native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const FinancialReports = () => {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const fetchFinancials = async () => {
    setLoading(true);
    
    let startDate, endDate;
    const startYear = selectedYear;
    const startMonth = selectedMonth + 1;
    const startMonthStr = startMonth < 10 ? `0${startMonth}` : `${startMonth}`;
    
    if (viewMode === 'monthly') {
      startDate = `${startYear}-${startMonthStr}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const lastDayStr = lastDay < 10 ? `0${lastDay}` : `${lastDay}`;
      endDate = `${startYear}-${startMonthStr}-${lastDayStr}`;
    } else {
      startDate = `${startYear}-01-01`;
      endDate = `${startYear}-12-31`;
    }

    try {
      // 1. Obtener pagos en el rango de fechas
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, student_id, amount, payment_date')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (paymentsError) throw paymentsError;

      const income = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      setTotalIncome(income);

      // 2. Obtener inscripciones
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, student_id, class_id');

      if (enrollmentsError) throw enrollmentsError;

      // 3. Obtener clases
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, base_price, teacher_commission_pct, teacher_id, activity_name');

      if (classesError) throw classesError;

      // 4. Obtener perfiles de profesoras
      const { data: teachers, error: teachersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher');

      if (teachersError) throw teachersError;

      // Mapeos en memoria para resolver relaciones
      const teachersMap: Record<string, string> = {};
      teachers?.forEach(t => {
        teachersMap[t.id] = t.full_name;
      });

      const classesMap: Record<string, any> = {};
      classes?.forEach(c => {
        classesMap[c.id] = {
          id: c.id,
          base_price: c.base_price || 0,
          teacher_commission_pct: c.teacher_commission_pct || 0,
          teacher_name: teachersMap[c.teacher_id] || 'Sin Profesora',
          activity_name: c.activity_name || 'Clase',
        };
      });

      const studentClassesMap: Record<string, any[]> = {};
      enrollments?.forEach(e => {
        if (!studentClassesMap[e.student_id]) {
          studentClassesMap[e.student_id] = [];
        }
        const classDetails = classesMap[e.class_id];
        if (classDetails) {
          studentClassesMap[e.student_id].push(classDetails);
        }
      });

      // Calcular rentabilidad y comisiones
      const classStats: Record<string, any> = {};
      let totalCalculatedExpenses = 0;
      let unassignedRevenue = 0;

      payments?.forEach(p => {
        const amt = Number(p.amount);
        const studentId = p.student_id;
        const enrolledClasses = studentClassesMap[studentId] || [];

        if (enrolledClasses.length === 0) {
          unassignedRevenue += amt;
          return;
        }

        const share = amt / enrolledClasses.length;
        enrolledClasses.forEach(cls => {
          if (!classStats[cls.id]) {
            classStats[cls.id] = {
              id: cls.id,
              name: cls.activity_name,
              teacher_name: cls.teacher_name,
              revenue: 0,
              expenses: 0,
              profit: 0,
              commission_pct: cls.teacher_commission_pct
            };
          }
          classStats[cls.id].revenue += share;
          
          // Calcular el pago a la profesora a partir del porcentaje de comisión asignado a la clase
          const teacherPayout = share * (cls.teacher_commission_pct / 100);
          classStats[cls.id].expenses += teacherPayout;
          totalCalculatedExpenses += teacherPayout;
        });
      });

      const calculatedMonthlyData = Object.values(classStats).map((cls: any) => {
        cls.profit = cls.revenue - cls.expenses;
        cls.revenue = Math.round(cls.revenue * 100) / 100;
        cls.expenses = Math.round(cls.expenses * 100) / 100;
        cls.profit = Math.round(cls.profit * 100) / 100;
        return cls;
      });

      if (unassignedRevenue > 0) {
        calculatedMonthlyData.push({
          id: 'unassigned',
          name: 'Planes Sin Clase Asignada',
          teacher_name: '-',
          revenue: Math.round(unassignedRevenue * 100) / 100,
          expenses: 0,
          profit: Math.round(unassignedRevenue * 100) / 100,
          commission_pct: 0
        });
      }

      setMonthlyData(calculatedMonthlyData);
      setTotalExpenses(Math.round(totalCalculatedExpenses * 100) / 100);

    } catch (e) {
      console.error('Error calculating financials:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [selectedMonth, selectedYear, viewMode]);

  const getIncomeColors = () => {
    return {
      bg: colors.isDark ? '#1C3E2D' : '#E8F5E9',
      text: colors.isDark ? '#66BB6A' : '#2E7D32'
    };
  };

  const getExpenseColors = () => {
    return {
      bg: colors.isDark ? '#3E1C1F' : '#FFEBEE',
      text: colors.isDark ? '#E57373' : colors.error
    };
  };

  const incomeColors = getIncomeColors();
  const expenseColors = getExpenseColors();

  return (
    <ThemeContainer>
      <Title style={[styles.title, { color: colors.black }]}>Balance Económico</Title>

      <SegmentedButtons
        value={viewMode}
        onValueChange={value => setViewMode(value as any)}
        buttons={[
          { value: 'monthly', label: 'Mensual' },
          { value: 'annual', label: 'Anual' },
        ]}
        style={styles.segmentedButtons}
        theme={{
          colors: {
            secondaryContainer: colors.primary,
            onSecondaryContainer: '#FFFFFF',
            outline: colors.lightGray
          }
        }}
      />

      <Card 
        style={[styles.filterCard, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]} 
        onPress={() => setShowMonthPicker(true)}
      >
        <View style={styles.filterRow}>
          <IconButton icon="calendar" iconColor={colors.primary} />
          <Text style={[styles.monthText, { color: colors.primary }]}>
            {viewMode === 'monthly' ? `${months[selectedMonth]} ` : ''}{selectedYear}
          </Text>
          <IconButton icon="chevron-down" iconColor={colors.gray} />
        </View>
      </Card>

      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, { backgroundColor: incomeColors.bg }]}>
          <Card.Content>
            <DollarSign color={incomeColors.text} size={24} />
            <Text style={[styles.summaryLabel, { color: colors.gray }]}>Ingresos</Text>
            <Text style={[styles.summaryValue, { color: incomeColors.text }]}>${totalIncome}</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.summaryCard, { backgroundColor: expenseColors.bg }]}>
          <Card.Content>
            <TrendingDown color={expenseColors.text} size={24} />
            <Text style={[styles.summaryLabel, { color: colors.gray }]}>Egresos</Text>
            <Text style={[styles.summaryValue, { color: expenseColors.text }]}>${totalExpenses}</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={[styles.profitCard, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
        <Card.Content>
          <View style={styles.profitHeader}>
            <PieChart color={colors.primary} size={24} />
            <Text style={[styles.profitLabel, { color: colors.gray }]}>Ganancia Neta</Text>
          </View>
          <Text style={[styles.profitValue, { color: colors.primary }]}>${totalIncome - totalExpenses}</Text>
          <Divider style={{ marginVertical: 10 }} />
          <Text style={[styles.profitSubtitle, { color: colors.gray }]}>
            Margen de ganancia: {totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}%
          </Text>
        </Card.Content>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.black }]}>Rentabilidad por Clase</Text>
      {monthlyData.map((item, index) => {
        const isUnassigned = item.id === 'unassigned';
        return (
          <Card 
            key={index} 
            style={[
              styles.classCard, 
              { 
                backgroundColor: colors.white, 
                borderColor: colors.lightGray,
                shadowColor: colors.isDark ? 'transparent' : colors.black 
              }
            ]}
          >
            <Card.Content>
              <View style={styles.classCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.classCardTitle, { color: colors.black }]}>{item.name}</Text>
                  {!isUnassigned && (
                    <Text style={[styles.classCardSubtitle, { color: colors.gray }]}>
                      Profesora: {item.teacher_name}
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.profitBadge, 
                  { backgroundColor: item.profit >= 0 ? (colors.isDark ? '#1C3E2D' : '#E8F5E9') : (colors.isDark ? '#3E1C1F' : '#FFEBEE') }
                ]}>
                  <Text style={[
                    styles.profitBadgeText, 
                    { color: item.profit >= 0 ? (colors.isDark ? '#66BB6A' : '#2E7D32') : (colors.isDark ? '#E57373' : colors.error) }
                  ]}>
                    {item.profit >= 0 ? '+' : ''}${item.profit}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 10 }} />

              <View style={styles.classMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.gray }]}>Recaudado</Text>
                  <Text style={[styles.metricValue, { color: colors.black }]}>${item.revenue}</Text>
                </View>

                {!isUnassigned && (
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.gray }]}>Pago Profe ({item.commission_pct}%)</Text>
                    <Text style={[styles.metricValue, { color: expenseColors.text }]}>-${item.expenses}</Text>
                  </View>
                )}

                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.gray }]}>Ganancia Neta</Text>
                  <Text style={[
                    styles.metricValue, 
                    { color: item.profit >= 0 ? incomeColors.text : expenseColors.text }
                  ]}>
                    ${item.profit}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        );
      })}

      <Portal>
        <Modal
          visible={showMonthPicker}
          onDismiss={() => setShowMonthPicker(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.white }]}
        >
          <Title style={[styles.modalTitle, { color: colors.black }]}>Seleccionar Periodo</Title>
          
          <View style={styles.yearSelector}>
            <IconButton icon="minus" iconColor={colors.black} onPress={() => setSelectedYear(selectedYear - 1)} />
            <Text style={[styles.yearText, { color: colors.black }]}>{selectedYear}</Text>
            <IconButton icon="plus" iconColor={colors.black} onPress={() => setSelectedYear(selectedYear + 1)} />
          </View>

          {viewMode === 'monthly' && (
            <View style={styles.monthGrid}>
              {months.map((m, i) => (
                <Button 
                  key={m} 
                  mode={selectedMonth === i ? "contained" : "text"}
                  onPress={() => {
                    setSelectedMonth(i);
                    setShowMonthPicker(false);
                  }}
                  style={styles.monthButton}
                  buttonColor={selectedMonth === i ? colors.primary : undefined}
                  textColor={selectedMonth === i ? '#FFFFFF' : colors.primary}
                  labelStyle={{ fontSize: 10 }}
                >
                  {m.substring(0, 3)}
                </Button>
              ))}
            </View>
          )}

          <Button 
            mode="contained" 
            onPress={() => setShowMonthPicker(false)}
            style={styles.closeButton}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
          >
            Listo
          </Button>
        </Modal>
      </Portal>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  filterCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  profitCard: {
    borderRadius: 16,
    marginBottom: 24,
    elevation: 4,
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  profitLabel: {
    fontSize: 16,
  },
  profitValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  profitSubtitle: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  classCard: {
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  classCardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  profitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  profitBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  classMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  metricItem: {
    alignItems: 'flex-start',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 10,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthButton: {
    width: '30%',
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 10,
  }
});

export default FinancialReports;
