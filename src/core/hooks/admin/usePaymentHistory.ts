import { useState, useMemo } from 'react';
import type { PaymentEntity } from '@/core/types/finances.types';

export function usePaymentHistory(payments: PaymentEntity[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // Reset the page in the SAME render pass as a filter change. A post-render
  // effect commits one frame where the new filter is already applied while
  // currentPage still points at the previous page (React "storing information
  // from previous renders").
  const [previousFilters, setPreviousFilters] = useState({ searchTerm, methodFilter });
  if (previousFilters.searchTerm !== searchTerm || previousFilters.methodFilter !== methodFilter) {
    setPreviousFilters({ searchTerm, methodFilter });
    setCurrentPage(1);
  }

  const filteredPayments = useMemo(() => {
    const normalize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const searchNormalized = normalize(searchTerm);

    return payments.filter((p) => {
      const matchesSearch =
        normalize(p.profiles?.full_name || '').includes(searchNormalized) ||
        normalize(p.plan_details || '').includes(searchNormalized);
      const matchesMethod = methodFilter === 'all' || p.payment_method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, searchTerm, methodFilter]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE) || 1;

  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  return {
    searchTerm,
    setSearchTerm,
    methodFilter,
    setMethodFilter,
    currentPage,
    setCurrentPage,
    paginatedPayments,
    filteredPayments,
    totalPages,
    ITEMS_PER_PAGE
  };
}
