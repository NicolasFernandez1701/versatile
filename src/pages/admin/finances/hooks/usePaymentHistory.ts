import { useState, useEffect, useMemo } from 'react';
import type { PaymentEntity } from '@/core/types/finances.types';

export function usePaymentHistory(payments: PaymentEntity[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, methodFilter]);

  const filteredPayments = useMemo(() => {
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const searchNormalized = normalize(searchTerm);

    return payments.filter(p => {
      const matchesSearch = normalize(p.profiles?.full_name || '').includes(searchNormalized) ||
        normalize(p.plan_details || '').includes(searchNormalized);
      const matchesMethod = methodFilter === 'all' || p.payment_method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, searchTerm, methodFilter]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE) || 1;
  
  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
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
