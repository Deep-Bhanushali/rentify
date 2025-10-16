import ProductCard from './ProductCard';
import { Product } from '@/types/models';

interface SimilarProductsProps {
  products: Product[];
  currentProductId: string;
}

export default function SimilarProducts({ products, currentProductId }: SimilarProductsProps) {
  // Filter out the current product and limit to 4 similar products
  const similarProducts = products
    .filter(product => product.id !== currentProductId)
    .slice(0, 4);

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similarProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}