'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { productsService } from '@/lib/api/products.service';
import { categoriesService } from '@/lib/api/categories.service';
import { vendorService } from '@/lib/api/vendor.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, X, Info } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ImageUploader from '@/components/ImageUploader';

export default function AddProductPage() {
  const router = useRouter();
  const [images, setImages] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialInput, setMaterialInput] = useState('');
  
  const { register, handleSubmit, setValue, control, watch, formState: { errors } } = useForm({
    mode: 'onTouched',
    defaultValues: {
      categoryId: '',
      name: '',
      description: '',
      color: '',
      price: '',
      compareAtPrice: '',
      sku: '',
      stockQuantity: '',
      assemblyRequired: false,
      roomType: '',
      style: '',
      brand: '',
      warranty: '',
      careInstructions: '',
      dimensionWidth: '',
      dimensionHeight: '',
      dimensionDepth: '',
      dimensionWeight: '',
      dimensionUnit: 'inch',
    },
  });


// Fetch vendor profile
const { data: vendorProfile } = useQuery({
  queryKey: ['vendor-profile'],
  queryFn: async () => {
    const result = await vendorService.getProfile();
    console.log('🏢 Raw vendor profile result:', result); // Debug
    
    // Handle axios response wrapper
    if (result?.data) {
      console.log('🏢 Found in result.data:', result.data);
      return result.data;
    }
    
    console.log('🏢 Using result directly:', result);
    return result;
  },
});
// Fetch categories
const { data: categoriesData } = useQuery({
  queryKey: ['categories'],
  queryFn: async () => {
    const result = await categoriesService.getCategories();
    console.log('🏷️ Raw categories result:', result); // Debug
    
    // Handle axios response wrapper
    if (result?.data) {
      if (Array.isArray(result.data)) {
        console.log('🏷️ Found in result.data (array):', result.data);
        return { categories: result.data };
      }
      if (result.data.categories) {
        console.log('🏷️ Found in result.data.categories:', result.data.categories);
        return { categories: result.data.categories };
      }
    }
    
    // Handle direct array
    if (Array.isArray(result)) {
      console.log('🏷️ Categories array:', result);
      return { categories: result };
    }
    
    // Handle object with categories property
    if (result?.categories) {
      console.log('🏷️ Categories in result.categories:', result.categories);
      return result;
    }
    
    console.log('🏷️ Returning empty categories');
    return { categories: [] };
  },
});

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: productsService.createProduct,
    onSuccess: () => {
      toast.success('Product created successfully!');
      router.push('/dashboard/products');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to create product');
    },
  });

  // Basic furniture colors
  const basicColors = [
    'White', 'Black', 'Gray', 'Beige', 'Brown',
    'Blue', 'Green', 'Red', 'Pink', 'Purple',
    'Yellow', 'Orange', 'Cream', 'Charcoal', 
    'Walnut', 'Oak', 'Cherry', 'Espresso',
    'Gold', 'Silver', 'Ivory', 'Teal', 'Olive'
  ];

  const roomTypes = [
    'Living Room', 'Bedroom', 'Dining Room', 'Office',
    'Kitchen', 'Bathroom', 'Outdoor', 'Kids Room'
  ];

  const styles = [
    'Modern', 'Traditional', 'Rustic', 'Contemporary',
    'Industrial', 'Minimalist', 'Vintage', 'Scandinavian',
    'Mid-Century Modern', 'Bohemian', 'Farmhouse', 'Coastal',
    'Art Deco', 'Transitional', 'Eclectic'
  ];

  // Image dropzone


  const addMaterial = () => {
    if (materialInput.trim()) {
      setMaterials(prev => [...prev, materialInput.trim()]);
      setMaterialInput('');
    }
  };

  const removeMaterial = (index) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    // Validate images
    if (images.length === 0) {
      toast.error('Please upload at least one product image');
      return;
    }

    // Validate materials
    if (materials.length === 0) {
      toast.error('Please add at least one material');
      return;
    }

    if (!vendorProfile?.id) {
      toast.error('Vendor profile not loaded');
      return;
    }

    // Build dimensions object
    const dimensions = {
      width: parseFloat(data.dimensionWidth),
      height: parseFloat(data.dimensionHeight),
      depth: parseFloat(data.dimensionDepth),
      weight: parseFloat(data.dimensionWeight),
      unit: data.dimensionUnit,
    };

    const productData = {
      vendorId: vendorProfile.id,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      compareAtPrice: data.compareAtPrice && data.compareAtPrice !== '' ? parseFloat(data.compareAtPrice) : undefined,
      sku: data.sku || null,
      stockQuantity: parseInt(data.stockQuantity),
      images: images.map(img => img.url || img), 
      dimensions: dimensions,
      materials: materials,
      colors: [data.color],
      roomType: data.roomType,
      style: data.style,
      assemblyRequired: data.assemblyRequired,
      brand: data.brand,
      warranty: data.warranty,
      careInstructions: data.careInstructions || '',
    };

    createMutation.mutate(productData);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-500 mt-1">Create a new product for your store</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Images */}
       
          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images *</CardTitle>
              <CardDescription>Upload high-quality images of your product</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploader images={images} setImages={setImages} maxImages={10} />
              
              {images.length === 0 && (
                <p className="text-sm text-red-600 mt-2">* At least one image is required</p>
              )}
            </CardContent>
          </Card>


        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide the essential details about your product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Product name is required' })}
                placeholder="e.g., Modern Velvet Sofa"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...register('description', { 
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' }
                })}
                placeholder="Provide detailed description. Include specific color shades if applicable (e.g., 'Available in Navy Blue, Light Blue, and Sky Blue')"
                rows={5}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Tip: Mention specific color shades and unique features in the description (minimum 10 characters)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="e.g., SOF-VEL-001"
              />
              {errors.sku && (
                <p className="text-sm text-red-600">{errors.sku.message}</p>
              )}
              <p className="text-xs text-gray-500">Optional: Unique identifier for inventory tracking</p>
            </div>
          </CardContent>
        </Card>

        {/* Product Classification */}
        <Card>
          <CardHeader>
            <CardTitle>Product Classification</CardTitle>
            <CardDescription>Help customers find your product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  rules={{ required: 'Category is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {categoriesData?.categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && (
                  <p className="text-sm text-red-600">{errors.categoryId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomType">Room Type *</Label>
                <Controller
                  name="roomType"
                  control={control}
                  rules={{ required: 'Room type is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {roomTypes.map((room) => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roomType && (
                  <p className="text-sm text-red-600">{errors.roomType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="style">Style *</Label>
                <Controller
                  name="style"
                  control={control}
                  rules={{ required: 'Style is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {styles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.style && (
                  <p className="text-sm text-red-600">{errors.style.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Color</CardTitle>
            <CardDescription>Select the main color of this product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="color">Color *</Label>
              <Controller
                name="color"
                control={control}
                rules={{ required: 'Color is required' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary color" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {basicColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.color && (
                <p className="text-sm text-red-600">{errors.color.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Select one primary color. For specific shades, mention them in the description.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Need multiple colors?</p>
                <p className="mt-1">
                  After creating this product, you can add color variants with different images, pricing, and stock levels in the Edit Product page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
            <CardDescription>Technical details and materials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dimensions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Dimensions *</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dimensionWidth" className="text-sm font-normal">Width *</Label>
                  <Input
                    id="dimensionWidth"
                    type="number"
                    step="0.01"
                    {...register('dimensionWidth', {
                      required: 'Width is required',
                      min: { value: 0.01, message: 'Must be greater than 0' }
                    })}
                    placeholder="0"
                  />
                  {errors.dimensionWidth && (
                    <p className="text-sm text-red-600">{errors.dimensionWidth.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensionHeight" className="text-sm font-normal">Height *</Label>
                  <Input
                    id="dimensionHeight"
                    type="number"
                    step="0.01"
                    {...register('dimensionHeight', {
                      required: 'Height is required',
                      min: { value: 0.01, message: 'Must be greater than 0' }
                    })}
                    placeholder="0"
                  />
                  {errors.dimensionHeight && (
                    <p className="text-sm text-red-600">{errors.dimensionHeight.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensionDepth" className="text-sm font-normal">Depth *</Label>
                  <Input
                    id="dimensionDepth"
                    type="number"
                    step="0.01"
                    {...register('dimensionDepth', {
                      required: 'Depth is required',
                      min: { value: 0.01, message: 'Must be greater than 0' }
                    })}
                    placeholder="0"
                  />
                  {errors.dimensionDepth && (
                    <p className="text-sm text-red-600">{errors.dimensionDepth.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensionWeight" className="text-sm font-normal">Weight *</Label>
                  <Input
                    id="dimensionWeight"
                    type="number"
                    step="0.01"
                    {...register('dimensionWeight', {
                      required: 'Weight is required',
                      min: { value: 0.01, message: 'Must be greater than 0' }
                    })}
                    placeholder="0"
                  />
                  {errors.dimensionWeight && (
                    <p className="text-sm text-red-600">{errors.dimensionWeight.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensionUnit" className="text-sm font-normal">Unit *</Label>
                  <Controller
                    name="dimensionUnit"
                    control={control}
                    rules={{ required: 'Unit is required' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="inch">in / lb</SelectItem>
                          <SelectItem value="cm">cm / kg</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.dimensionUnit && (
                    <p className="text-sm text-red-600">{errors.dimensionUnit.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Materials */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Materials *</Label>
              <div className="flex gap-2">
                <Input
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  placeholder="e.g., Velvet Fabric, Oak Wood, Steel"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMaterial();
                    }
                  }}
                />
                <Button type="button" onClick={addMaterial} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {materials.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {materials.map((material, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                    >
                      {material}
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="hover:text-gray-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {materials.length === 0 && (
                <p className="text-sm text-red-600">* At least one material is required</p>
              )}
            </div>

            {/* Brand & Warranty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  {...register('brand', { required: 'Brand is required' })}
                  placeholder="e.g., IKEA, Ashley Furniture"
                />
                {errors.brand && (
                  <p className="text-sm text-red-600">{errors.brand.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty *</Label>
                <Input
                  id="warranty"
                  {...register('warranty', { required: 'Warranty is required' })}
                  placeholder="e.g., 2 years manufacturer warranty"
                />
                {errors.warranty && (
                  <p className="text-sm text-red-600">{errors.warranty.message}</p>
                )}
              </div>
            </div>

            {/* Assembly Required */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="assemblyRequired"
                {...register('assemblyRequired')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="assemblyRequired" className="font-normal cursor-pointer">
                Assembly Required
              </Label>
            </div>

            {/* Care Instructions */}
            <div className="space-y-2">
              <Label htmlFor="careInstructions">Care Instructions</Label>
              <Textarea
                id="careInstructions"
                {...register('careInstructions')}
                placeholder="e.g., Wipe with damp cloth. Avoid direct sunlight. Professional cleaning recommended annually."
                rows={3}
              />
              {errors.careInstructions && (
                <p className="text-sm text-red-600">{errors.careInstructions.message}</p>
              )}
              <p className="text-xs text-gray-500">Optional: Add care and maintenance instructions</p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
            <CardDescription>Set your pricing and stock levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Regular Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    className="pl-7"
                    {...register('price', { 
                      required: 'Price is required',
                      min: { value: 0.01, message: 'Price must be greater than 0' }
                    })}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare at Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="compareAtPrice"
                    type="number"
                    step="0.01"
                    className="pl-7"
                    {...register('compareAtPrice', {
                      min: { value: 0, message: 'Must be 0 or greater' }
                    })}
                    placeholder="0.00"
                  />
                </div>
                {errors.compareAtPrice && (
                  <p className="text-sm text-red-600">{errors.compareAtPrice.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Optional: Show original price for sales (e.g., was $1,799, now $1,299)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Stock Quantity *</Label>
              <Input
                id="stockQuantity"
                type="number"
                {...register('stockQuantity', { 
                  required: 'Stock quantity is required',
                  min: { value: 0, message: 'Stock cannot be negative' }
                })}
                placeholder="0"
              />
              {errors.stockQuantity && (
                <p className="text-sm text-red-600">{errors.stockQuantity.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Number of units available for sale
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 sticky bottom-0 bg-white py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/products')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Product...
              </>
            ) : (
              'Create Product'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}