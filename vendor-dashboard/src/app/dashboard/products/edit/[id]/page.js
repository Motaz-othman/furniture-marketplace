'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { productsService } from '@/lib/api/products.service';
import { variantsService } from '@/lib/api/variants.service';
import { categoriesService } from '@/lib/api/categories.service';
import { uploadService } from '@/lib/api/upload.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, X, Loader2, Package, Info, Save } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ImageUploader from '@/components/ImageUploader';



export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  const queryClient = useQueryClient();

  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantImages, setVariantImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [variantForm, setVariantForm] = useState({
    color: '',
    size: '',
    price: '',
    compareAtPrice: '',
    sku: '',
    stockQuantity: '',
  });

  // For product details editing
  const [images, setImages] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialInput, setMaterialInput] = useState('');

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const result = await productsService.getProduct(productId);
      console.log('🔍 Raw product result:', result); // Debug
      return result;
    },
  });

  // Add this right after the query
  useEffect(() => {
    if (product) {
      console.log('📦 Product loaded:', product);
      console.log('📦 Product categoryId:', product.categoryId);
      console.log('📦 Product colors:', product.colors);
      console.log('📦 Product roomType:', product.roomType);
      console.log('📦 Product style:', product.style);
    }
  }, [product]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await categoriesService.getCategories();
      console.log('🏷️ Raw categories result:', result); // Debug

      // Handle axios response wrapper
      if (result?.data) {
        if (Array.isArray(result.data)) {
          console.log('🏷️ Found in result.data (array):', result.data); // Debug
          return { categories: result.data };
        }
        if (result.data.categories) {
          console.log('🏷️ Found in result.data.categories:', result.data.categories); // Debug
          return { categories: result.data.categories };
        }
      }

      // Handle direct array
      if (Array.isArray(result)) {
        console.log('🏷️ Categories array:', result); // Debug
        return { categories: result };
      }

      // Handle object with categories property
      if (result?.categories) {
        console.log('🏷️ Categories in result.categories:', result.categories); // Debug
        return result;
      }

      console.log('🏷️ Returning empty categories'); // Debug
      return { categories: [] };
    },
  });


// Initialize form when product loads
useEffect(() => {
  console.log('🔄 useEffect triggered - product:', !!product, 'categories:', !!categoriesData);
  
  if (product && categoriesData?.categories) {
    console.log('📝 Initializing form with product:', product);
    
    const formData = {
      name: product.name || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      price: product.price || '',
      compareAtPrice: product.compareAtPrice || '',
      sku: product.sku || '',
      stockQuantity: product.stockQuantity || '',
      color: product.colors?.[0] || '',
      roomType: product.roomType || '',
      style: product.style || '',
      brand: product.brand || '',
      warranty: product.warranty || '',
      careInstructions: product.careInstructions || '',
      assemblyRequired: product.assemblyRequired || false,
      dimensionWidth: product.dimensions?.width || '',
      dimensionHeight: product.dimensions?.height || '',
      dimensionDepth: product.dimensions?.depth || '',
      dimensionWeight: product.dimensions?.weight || '',
      dimensionUnit: product.dimensions?.unit || 'inch',
    };
    
    console.log('📝 Form data to set:', formData);
    console.log('📝 Calling reset()...');
    
    reset(formData);
    
    console.log('✅ Reset complete');

    // Set images
    if (product.images?.length > 0) {
      setImages(product.images.map(url => ({ url })));
    }

    // Set materials
    if (product.materials?.length > 0) {
      setMaterials(product.materials);
    }
  }
}, [product?.id, categoriesData?.categories?.length]); // ← Only depend on IDs/lengths, not entire objects

  console.log('🔍 Current productId:', productId); // Debug

  // Fetch variants
  const { data: variantsData, isLoading: variantsLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      try {
        const result = await variantsService.getProductVariants(productId);
        console.log('📦 Edit page - Raw variants result:', result); // Debug

        // Handle different response formats
        // Check for result.data.variants (axios response wrapped)
        if (result?.data?.variants) {
          console.log('📦 Edit page - Found in result.data.variants:', result.data.variants);
          return { variants: result.data.variants };
        }

        // Check for result.variants
        if (result?.variants) {
          console.log('📦 Edit page - Found in result.variants:', result.variants);
          return { variants: result.variants };
        }

        // Check if result is array
        if (Array.isArray(result)) {
          console.log('📦 Edit page - Found array:', result);
          return { variants: result };
        }

        console.log('📦 Edit page - No variants found, returning empty'); // Debug
        return { variants: [] };
      } catch (error) {
        console.error('❌ Edit page - Error fetching variants:', error);
        return { variants: [] };
      }
    },
    enabled: !!productId,
  });

  // Add this right after the query
  console.log('📦 Edit page - variantsData:', variantsData); // Debug
  console.log('📦 Edit page - variantsLoading:', variantsLoading); // Debug


// Form for product details
const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
  mode: 'onTouched',
});
  


// Initialize form when product loads - ONLY ONCE
useEffect(() => {
  if (!product || !categoriesData?.categories) {
    return; // Don't do anything if data isn't ready
  }
  
  console.log('📝 Setting form values');
  
  const formData = {
    name: product.name || '',
    description: product.description || '',
    categoryId: product.categoryId || '',
    price: product.price || '',
    compareAtPrice: product.compareAtPrice || '',
    sku: product.sku || '',
    stockQuantity: product.stockQuantity || '',
    color: product.colors?.[0] || '',
    roomType: product.roomType || '',
    style: product.style || '',
    brand: product.brand || '',
    warranty: product.warranty || '',
    careInstructions: product.careInstructions || '',
    assemblyRequired: product.assemblyRequired || false,
    dimensionWidth: product.dimensions?.width || '',
    dimensionHeight: product.dimensions?.height || '',
    dimensionDepth: product.dimensions?.depth || '',
    dimensionWeight: product.dimensions?.weight || '',
    dimensionUnit: product.dimensions?.unit || 'inch',
  };
  
  // Use setTimeout to ensure categories are rendered first
  setTimeout(() => {
    reset(formData);
    console.log('✅ Form reset complete');
  }, 0);

  // Set images
  if (product.images?.length > 0) {
    setImages(product.images.map(url => ({ url })));
  }

  // Set materials
  if (product.materials?.length > 0) {
    setMaterials(product.materials);
  }
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [product?.id]); // Only run when product ID changes

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: (data) => productsService.updateProduct(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product', productId]);
      queryClient.invalidateQueries(['vendor-products']);
      toast.success('Product updated successfully!');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to update product');
    },
  });

  // Create variant mutation
  const createVariantMutation = useMutation({
    mutationFn: (data) => variantsService.createVariant(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-variants', productId]);
      toast.success('Variant created successfully!');
      closeVariantDialog();
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to create variant');
    },
  });

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }) => variantsService.updateVariant(variantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-variants', productId]);
      toast.success('Variant updated successfully!');
      closeVariantDialog();
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to update variant');
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: variantsService.deleteVariant,
    onSuccess: () => {
      queryClient.invalidateQueries(['product-variants', productId]);
      toast.success('Variant deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to delete variant');
    },
  });

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

  const addMaterial = () => {
    if (materialInput.trim()) {
      setMaterials(prev => [...prev, materialInput.trim()]);
      setMaterialInput('');
    }
  };

  const removeMaterial = (index) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmitProductDetails = async (data) => {
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

    // Build dimensions object
    const dimensions = {
      width: parseFloat(data.dimensionWidth),
      height: parseFloat(data.dimensionHeight),
      depth: parseFloat(data.dimensionDepth),
      weight: parseFloat(data.dimensionWeight),
      unit: data.dimensionUnit,
    };

    const productData = {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      price: parseFloat(data.price),
      compareAtPrice: data.compareAtPrice && data.compareAtPrice !== '' ? parseFloat(data.compareAtPrice) : undefined,
      sku: data.sku?.trim() || null,
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

    updateProductMutation.mutate(productData);
  };

  // Variant image dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxSize: 5242880,
    onDrop: async (acceptedFiles) => {
      setUploadingImages(true);
      try {
        const uploadPromises = acceptedFiles.map(file => uploadService.uploadSingle(file));
        const results = await Promise.all(uploadPromises);
        const imageUrls = results.map(result => result.url);
        setVariantImages(prev => [...prev, ...imageUrls]);
        toast.success(`${acceptedFiles.length} image(s) uploaded`);
      } catch (error) {
        toast.error('Failed to upload images');
      } finally {
        setUploadingImages(false);
      }
    },
  });

  const openVariantDialog = (variant = null) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        color: variant.color || '',
        size: variant.size || '',
        price: variant.price.toString(),
        compareAtPrice: variant.compareAtPrice?.toString() || '',
        sku: variant.sku || '',
        stockQuantity: variant.stockQuantity.toString(),
      });
      setVariantImages(variant.images || []);
    } else {
      setEditingVariant(null);
      setVariantForm({
        color: '',
        size: '',
        price: product?.price?.toString() || '',
        compareAtPrice: product?.compareAtPrice?.toString() || '',
        sku: '',
        stockQuantity: '',
      });
      setVariantImages([]);
    }
    setVariantDialogOpen(true);
  };

  const closeVariantDialog = () => {
    setVariantDialogOpen(false);
    setEditingVariant(null);
    setVariantForm({
      color: '',
      size: '',
      price: '',
      compareAtPrice: '',
      sku: '',
      stockQuantity: '',
    });
    setVariantImages([]);
  };

  const handleVariantSubmit = (e) => {
    e.preventDefault();

    if (!variantForm.color && !variantForm.size) {
      toast.error('Please specify at least color or size');
      return;
    }

    if (!variantForm.price) {
      toast.error('Price is required');
      return;
    }

    if (!variantForm.stockQuantity) {
      toast.error('Stock quantity is required');
      return;
    }

    const data = {
      color: variantForm.color || null,
      size: variantForm.size || null,
      price: parseFloat(variantForm.price),
      compareAtPrice: variantForm.compareAtPrice ? parseFloat(variantForm.compareAtPrice) : null,
      sku: variantForm.sku || null,
      stockQuantity: parseInt(variantForm.stockQuantity),
      images: variantImages,
    };

    if (editingVariant) {
      updateVariantMutation.mutate({ variantId: editingVariant.id, data });
    } else {
      createVariantMutation.mutate(data);
    }
  };

  const handleDeleteVariant = (variantId) => {
    if (confirm('Are you sure you want to delete this variant?')) {
      deleteVariantMutation.mutate(variantId);
    }
  };

  const removeVariantImage = (index) => {
    setVariantImages(prev => prev.filter((_, i) => i !== index));
  };

  const getVariantLabel = (variant) => {
    const parts = [];
    if (variant.color) parts.push(variant.color);
    if (variant.size) parts.push(variant.size);
    return parts.join(' - ') || 'Variant';
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-500 mt-1">Edit product details and manage variants</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="variants">Variants ({variantsData?.variants?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Product Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <form onSubmit={handleSubmit(onSubmitProductDetails)} className="space-y-6">
            {/* Product Images */}
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>Update your product images</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader images={images} setImages={setImages} maxImages={10} />
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
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
                    placeholder="Provide detailed description"
                    rows={5}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    {...register('sku')}
                    placeholder="e.g., SOF-VEL-001"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Product Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category *</Label>
                    <Controller
                      name="categoryId"
                      control={control}
                      rules={{ required: 'Category is required' }}
                      render={({ field }) => {
                        console.log('🎨 Category field.value:', field.value);
                        console.log('🎨 Available categories:', categoriesData?.categories);
                        return (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
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
                        );
                      }}
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
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

            {/* Color */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Color</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="color">Color *</Label>
                  <Controller
                    name="color"
                    control={control}
                    rules={{ required: 'Color is required' }}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
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
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
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
                        defaultValue="inch"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || 'inch'}>
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
                    placeholder="e.g., Wipe with damp cloth. Avoid direct sunlight."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
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
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center justify-end space-x-4 sticky bottom-0 bg-white py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/products')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>


        {/* Variants Tab */}
        <TabsContent value="variants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription className="mt-1">
                    Manage different colors and sizes for this product
                  </CardDescription>
                </div>
                <Button onClick={() => openVariantDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variantsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading variants...
                </div>
              ) : !variantsData?.variants || variantsData.variants.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No variants yet</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    Does this product come in different colors or sizes? Add variants to manage different options with their own pricing, images, and stock levels.
                  </p>
                  <Button onClick={() => openVariantDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Variant
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Images</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variantsData.variants.map((variant) => (
                        <TableRow key={variant.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{getVariantLabel(variant)}</p>
                              <div className="text-xs text-gray-500 mt-1">
                                {variant.color && <span>Color: {variant.color}</span>}
                                {variant.color && variant.size && <span className="mx-1">•</span>}
                                {variant.size && <span>Size: {variant.size}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {variant.images?.length > 0 ? (
                              <div className="flex gap-1">
                                {variant.images.slice(0, 3).map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt=""
                                    className="w-10 h-10 object-cover rounded border"
                                  />
                                ))}
                                {variant.images.length > 3 && (
                                  <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-600">
                                    +{variant.images.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No images</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">${variant.price.toFixed(2)}</p>
                              {variant.compareAtPrice && (
                                <p className="text-sm text-gray-500 line-through">
                                  ${variant.compareAtPrice.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${variant.stockQuantity < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                              {variant.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 font-mono">{variant.sku || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openVariantDialog(variant)}
                                title="Edit variant"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteVariant(variant.id)}
                                title="Delete variant"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? 'Edit Variant' : 'Add New Variant'}
            </DialogTitle>
            <DialogDescription>
              {editingVariant
                ? 'Update variant details, pricing, and images'
                : 'Create a new color or size variant for this product'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVariantSubmit} className="space-y-4">
            {/* Variant Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variantColor">Color</Label>
                <Select
                  value={variantForm.color}
                  onValueChange={(value) => setVariantForm({ ...variantForm, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {basicColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={variantForm.size}
                  onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
                  placeholder="e.g., Queen, King, Large"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">* At least one of Color or Size must be specified</p>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare at Price</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  step="0.01"
                  value={variantForm.compareAtPrice}
                  onChange={(e) => setVariantForm({ ...variantForm, compareAtPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* SKU & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="e.g., SOF-VEL-NAVY-Q"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={variantForm.stockQuantity}
                  onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Variant Images</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {uploadingImages ? 'Uploading...' : 'Upload images for this variant'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Drag & drop or click to browse</p>
              </div>

              {variantImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {variantImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Variant ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariantImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeVariantDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createVariantMutation.isPending || updateVariantMutation.isPending || uploadingImages}
              >
                {(createVariantMutation.isPending || updateVariantMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingVariant ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingVariant ? 'Update Variant' : 'Create Variant'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}