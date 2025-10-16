'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/models';

export default function Home() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=6');
        const data = await response.json();
        console.log('Featured products data:', data);

        if (data.success) {
          setFeaturedProducts(data.data.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Search */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-800/90"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,_theme(colors.blue.400),transparent_50%)] opacity-20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_theme(colors.indigo.400),transparent_50%)] opacity-20"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Find Your Perfect
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
              Rental
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-blue-100 leading-relaxed">
            Discover a wide range of products available for rent in your area. From electronics to furniture, find exactly what you need.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto px-4 w-full">
            <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-2 shadow-2xl">
              <input
                type="text"
                placeholder="Search for products..."
                className="flex-grow px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-300 text-base md:text-lg placeholder-blue-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold px-6 py-3 rounded-xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl whitespace-nowrap text-sm md:text-base"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Browse Categories</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find exactly what you&apos;re looking for across our diverse range of categories
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Electronics', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'from-blue-500 to-cyan-500' },
              { name: 'Furniture', icon: 'M3 6l3-3 3 3M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6M3 6h18M9 6v12M15 6v12', color: 'from-green-500 to-emerald-500' },
              { name: 'Vehicles', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'from-purple-500 to-indigo-500' },
              { name: 'Tools', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: 'from-orange-500 to-red-500' }
            ].map((category) => (
              <Link
                key={category.name}
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className="group bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-gray-200"
              >
                <div className={`bg-gradient-to-br ${category.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={category.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{category.name}</h3>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-sm text-gray-500">Explore →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Featured Products</h2>
            <Link
              href="/products"
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
            >
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started with Rentify is simple and straightforward
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Browse Products',
                description: 'Search through our wide selection of rental products in your area',
                icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                step: '2',
                title: 'Request Rental',
                description: 'Submit a rental request for the dates you need the product',
                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                color: 'from-green-500 to-emerald-500'
              },
              {
                step: '3',
                title: 'Enjoy & Return',
                description: 'Pick up the product, enjoy using it, and return it when done',
                icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 2.286a1 1 0 010 1.414l-.286.286a1 1 0 01-1.414 0l-.286-.286a1 1 0 00-1.414 0l-6.286 6.286a1 1 0 01-1.414 0l-.286-.286a1 1 0 010-1.414L15 3z',
                color: 'from-purple-500 to-indigo-500'
              }
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="relative">
                  <div className={`bg-gradient-to-br ${item.color} w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-all duration-300`}>
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-gray-900">{item.step}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_theme(colors.blue.400),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,_theme(colors.indigo.400),transparent_70%)]"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Ready to Start Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Rental Journey?
              </span>
            </h2>
            <p className="text-xl md:text-2xl mb-10 text-blue-100 leading-relaxed">
              Join thousands of satisfied customers who are saving money and reducing waste with our rental platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold px-10 py-4 rounded-2xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-yellow-500/25"
              >
                Browse Products
              </Link>
              <Link
                href="/signup"
                className="border-2 border-white text-white font-bold px-10 py-4 rounded-2xl hover:bg-white hover:text-gray-900 transition-all duration-300"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
