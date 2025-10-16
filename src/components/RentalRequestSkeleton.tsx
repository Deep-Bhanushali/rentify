'use client';

interface RentalRequestSkeletonProps {
  viewMode?: 'card' | 'list';
}

export default function RentalRequestSkeleton({ viewMode = 'card' }: RentalRequestSkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 animate-pulse flex flex-col lg:flex-row">
        {/* Product Image */}
        <div className="w-full lg:w-1/3 relative h-48 lg:h-auto bg-gray-200">
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-300 w-16 h-6"></div>
        </div>

        {/* Request Details */}
        <div className="w-full lg:w-3/4 p-4 lg:p-6 flex flex-col justify-between flex-1">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 lg:mb-4">
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded-full w-24"></div>
            </div>

            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3 lg:mb-4"></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4">
              <div className="flex items-center text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-300 mr-3 flex-shrink-0"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-300 mr-3 flex-shrink-0"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-300 mr-3 flex-shrink-0"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-14 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-18"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <div className="flex items-center gap-4">
              <div className="h-8 bg-gray-200 rounded-lg w-20"></div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-10 bg-gray-300 rounded-lg w-32"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card view skeleton
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 animate-pulse">
      <div className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0"></div>
              <div>
                <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="h-8 bg-gray-200 rounded-full w-20"></div>
          </div>

          {/* User Info */}
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded bg-gray-300 mr-3"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded bg-gray-300 mr-3"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded bg-gray-300 mr-3"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-18 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded bg-gray-300 mr-3"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-22 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-3">
              <div className="h-10 bg-gray-300 rounded-lg w-32"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-28"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
