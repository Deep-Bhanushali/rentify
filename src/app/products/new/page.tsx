'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/ProductForm';

export default function NewProductPage() {
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductForm />
      </div>
    </div>
  );
}