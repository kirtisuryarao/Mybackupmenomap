'use client'

import { Star, ShoppingCart, Heart } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCycleData } from '@/hooks/use-cycle-data'

interface Product {
  id: string
  name: string
  price: number
  image: string
  category: 'period' | 'wellness' | 'nutrition' | 'wellness-tools'
  rating: number
  reviews: number
  description: string
  phases?: string[]
}

const products: Product[] = [
  {
    id: '1',
    name: 'Organic Cotton Period Pads',
    price: 12.99,
    image: '🩸',
    category: 'period',
    rating: 4.8,
    reviews: 324,
    description: 'Eco-friendly, ultra-soft period pads with no chemicals',
    phases: ['period'],
  },
  {
    id: '2',
    name: 'Menstrual Cup (Reusable)',
    price: 29.99,
    image: '🔴',
    category: 'period',
    rating: 4.7,
    reviews: 512,
    description: 'Sustainable, comfortable, and money-saving alternative',
    phases: ['period'],
  },
  {
    id: '3',
    name: 'Heating Pad with Auto Shut-off',
    price: 34.99,
    image: '🌡️',
    category: 'wellness',
    rating: 4.9,
    reviews: 287,
    description: 'Fast heating, soothing relief for period cramps',
    phases: ['period', 'luteal'],
  },
  {
    id: '4',
    name: 'Magnesium Supplement',
    price: 16.99,
    image: '💊',
    category: 'nutrition',
    rating: 4.6,
    reviews: 198,
    description: 'Helps reduce PMS symptoms and improve sleep quality',
    phases: ['luteal'],
  },
  {
    id: '5',
    name: 'Premium Yoga Mat',
    price: 49.99,
    image: '🧘',
    category: 'wellness-tools',
    rating: 4.8,
    reviews: 445,
    description: 'Non-slip, eco-friendly mat for all your exercises',
  },
  {
    id: '6',
    name: 'Cycle-Synced Workout Guide',
    price: 19.99,
    image: '📖',
    category: 'wellness-tools',
    rating: 4.7,
    reviews: 156,
    description: 'Digital guide with phase-specific workout routines',
  },
  {
    id: '7',
    name: 'Iron-Rich Snack Pack',
    price: 24.99,
    image: '🍫',
    category: 'nutrition',
    rating: 4.5,
    reviews: 89,
    description: 'Delicious snacks packed with iron and minerals',
    phases: ['period'],
  },
  {
    id: '8',
    name: 'Sleep Support Tea Collection',
    price: 22.99,
    image: '🍵',
    category: 'nutrition',
    rating: 4.6,
    reviews: 267,
    description: 'Organic herbal teas to support better sleep',
    phases: ['luteal'],
  },
  {
    id: '9',
    name: 'Portable Period Kit',
    price: 28.99,
    image: '👜',
    category: 'period',
    rating: 4.7,
    reviews: 203,
    description: 'Discreet carry kit with essentials for on-the-go',
    phases: ['period'],
  },
  {
    id: '10',
    name: 'Cycle Sync Meal Plan',
    price: 39.99,
    image: '🥗',
    category: 'nutrition',
    rating: 4.8,
    reviews: 178,
    description: 'Monthly meal plans optimized for each cycle phase',
  },
  {
    id: '11',
    name: 'Stress Relief Aromatherapy Kit',
    price: 32.99,
    image: '🕯️',
    category: 'wellness',
    rating: 4.7,
    reviews: 234,
    description: 'Essential oils and diffuser for relaxation',
    phases: ['luteal'],
  },
  {
    id: '12',
    name: 'Period Underwear (Pack of 3)',
    price: 44.99,
    image: '👖',
    category: 'period',
    rating: 4.9,
    reviews: 567,
    description: 'Leak-proof, comfortable, and machine washable',
    phases: ['period'],
  },
]

export default function PartnerShopPage() {
  const { todayInfo, isLoading } = useCycleData()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'period', label: 'Period Care' },
    { id: 'wellness', label: 'Wellness' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'wellness-tools', label: 'Tools & Guides' },
  ]

  const filteredProducts = selectedCategory && selectedCategory !== 'all'
    ? products.filter((p) => p.category === selectedCategory)
    : products

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
  }

  if (isLoading) {
    return (
      <div className="text-center">Loading shop...</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Wellness Shop</h1>
        <p className="text-muted-foreground">
          Curated products to support your partner's menstrual health and well-being
        </p>
      </div>

      {/* Phase Recommendation */}
      {todayInfo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              <span className="font-semibold text-foreground">Recommended for your partner's phase:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {products
                .filter((p) => p.phases?.includes(todayInfo.phase))
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {p.name}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setSelectedCategory(cat.id === 'all' ? null : cat.id)
            }
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              (selectedCategory === cat.id || (cat.id === 'all' && !selectedCategory))
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 pb-0 flex-1">
              <div className="mb-4">
                <div className="text-5xl mb-3 text-center">{product.image}</div>
                <h3 className="font-semibold text-foreground mb-2">{product.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{product.description}</p>

                {/* Ratings */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      {product.rating}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({product.reviews} reviews)
                  </span>
                </div>

                {/* Price */}
                <div className="text-xl font-bold text-primary mb-4">
                  ₹{product.price}
                </div>
              </div>
            </CardContent>

            {/* Buttons */}
            <div className="border-t border-border p-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => toggleFavorite(product.id)}
              >
                <Heart
                  className={`h-4 w-4 ${
                    favorites.has(product.id)
                      ? 'fill-primary text-primary'
                      : ''
                  }`}
                />
              </Button>
              <Button size="sm" className="flex-1 gap-2">
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No products found in this category</p>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Why Shop with Us?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-1">Curated Selection</p>
              <p className="text-muted-foreground">
                Hand-picked products specifically for menstrual and reproductive health.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Phase-Specific</p>
              <p className="text-muted-foreground">
                Find products perfect for your current cycle phase.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Trusted Partners</p>
              <p className="text-muted-foreground">
                We work only with brands we trust and believe in.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cart Summary */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You have 0 items in your cart
          </p>
          <Button disabled className="w-full">
            Proceed to Checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}