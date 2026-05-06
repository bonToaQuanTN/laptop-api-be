import { Injectable,NotFoundException, UnauthorizedException, ForbiddenException,BadRequestException, InternalServerErrorException} from '@nestjs/common';
import {Users} from '../model/model.user';
import {Category} from '../model/model.category';
import {Product} from '../model/model.product';
import {ProductImage} from '../model/model.productImage';
import {Order} from '../model/model.order';
import {OrderItem} from '../model/model.orderItem';
import {Permission} from '../model/model.permission';
import {Role} from '../model/model.role';
import {Discount} from '../model/model.discount';
import {Warehouse} from '../model/model.warehouse';
import {Inventory} from '../model/model.inventory';
import {Cart} from '../model/model.cart';
import {CartItem} from '../model/model.cartItem';
import {InjectModel} from '@nestjs/sequelize';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { ConflictException } from '@nestjs/common';
import {CreateUserDto, UpdateUserDto,LoginDto} from '../dto/dto.user';
import { Op } from 'sequelize';
import { CreateRoleDto } from 'src/dto/dto.role';
import { CreateProductDto, UpdateProductDto } from 'src/dto/dto.product';
import {  CreateOrderDto, UpdateOrderDto} from 'src/dto/dto.order';
import {CreateOrderItemDto} from 'src/dto/dto.orderItem';
import {PermissionDto} from 'src/dto/dto.permission';
import {DiscountDto} from 'src/dto/dto.discount';
import {CreateProductImageDto, UpdateProductImageDto} from 'src/dto/dto.productImages';
import{CreateCartItemDto, UpdateCartItemDto} from 'src/dto/dto.cartItem';
import{CreateWarehouseDto,UpdateWarehouseDto} from 'src/dto/dto.warehouses';
import{CreateInventoryDto,UpdateInventoryDto} from 'src/dto/dto.inventory';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Users) private userModel: typeof Users,
    @InjectModel(Role) private roleModel: typeof Role,
    @InjectModel(Permission) private permissionModel: typeof Permission,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Product) private productModel: typeof Product,
    @InjectModel(Order) private orderModel: typeof Order,
    @InjectModel(OrderItem) private orderItemModel: typeof OrderItem,
    @InjectModel(Category) private categoryModel: typeof Category,
    @InjectModel(Discount) private discountModel: typeof Discount,
    @InjectModel(Warehouse) private warehouseModel: typeof Warehouse,
    @InjectModel(Inventory) private inventoryModel: typeof Inventory,
    @InjectModel(Cart) private cartModel: typeof Cart,
    @InjectModel(CartItem) private cartItemModel: typeof CartItem,
    @InjectModel(ProductImage) private productImageModel: typeof ProductImage,

    private readonly jwtService: JwtService
  ) {}
  async generateUserId(){
    const lastUser = await this.userModel.findOne({order: [['id', 'DESC']] });
    if (!lastUser) return '221CTT001';
    const lastNumber = parseInt(lastUser.id.slice(-3));
    const newNumber = lastNumber + 1;
    return `221CTT${String(newNumber).padStart(3, '0')}`;
  }

  async createUser(data: CreateUserDto) {
    this.logger.log(`Create user attempt: ${data.email}`);
    try {
      const existUser = await this.userModel.findOne({ where: { email: data.email } });
      if (existUser) {
        this.logger.warn(`Create user failed - email exists: ${data.email}`);
        throw new ConflictException('Email already exists');
      }

      if (!data.roleId) {
        this.logger.log(`No roleId provided, assigning default 'guest' role`);
        const guestRole = await this.roleModel.findOne({ where: { name: 'guest' } });
        
        if (!guestRole) {
          this.logger.error('Default "guest" role not found in database');
          throw new InternalServerErrorException('System error: Default "guest" role is missing. Please contact admin.');
        }
        data.roleId = guestRole.id;
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const id = await this.generateUserId();
      
      const newUser = await this.userModel.create({...data,password: hashedPassword,id});

      await this.cacheManager.clear();
      this.logger.log(`User created successfully: ${data.email} with roleId: ${data.roleId}`);
      
      const userResponse = newUser.toJSON();
      delete userResponse.password;
      delete userResponse.refreshToken;
      return userResponse;

    } catch (error) {
      this.handleError(error, 'Create user error');
      throw error;
    }
  }

  async getUser(page: number = 1, limit: number = 5) {
    // 1. Bảo vệ logic: Đảm bảo page và limit luôn lớn hơn 0
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 5);
    
    const cacheKey = `users_page_${safePage}_limit_${safeLimit}`;
    this.logger.log(`Fetching users - Page: ${safePage}, Limit: ${safeLimit}`);

    try {
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }         
      
      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const offset = (safePage - 1) * safeLimit;

      const { count, rows } = await this.userModel.findAndCountAll({
        // QUAN TRỌNG: Exclude cả refreshToken
        attributes: { exclude: ['password', 'refreshToken'] }, 
        limit: safeLimit, 
        offset,
        // Đổi sang sắp xếp theo createdAt giảm dần (mới nhất lên đầu)
        order: [['createdAt', 'DESC']],
        include: [{model: Role,attributes: ['id', 'name']
        }]
      });

      const result = {
        totalUsers: count,
        currentPage: safePage,
        totalPages: Math.ceil(count / safeLimit), // Lúc này safeLimit chắc chắn > 0
        users: rows.map(u => u.get({ plain: true }))
      };

      await this.cacheManager.set(cacheKey, result, 60000);

      return result;
    } catch (error) {
      this.handleError(error, 'Get users error');
      throw error;
    }
  }
  async getByUserId(id: string) {
    const key = `user_${id}`;
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.log(`CACHE HIT: ${key}`);
        return cached;
      }
      
      this.logger.warn(`CACHE MISS: ${key}`);
      const user = await this.userModel.findOne({
        where: { id }, 
        attributes: { exclude: ['password', 'refreshToken'] }, // Thêm refreshToken vào exclude
        include: [{ model: Role, attributes: ['id', 'name'] }] // Thêm Role cho đầy đủ
      });

      if (!user) {
        this.logger.warn(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }
      
      const plainUser = user.toJSON(); // Chuyển về JSON thuần trước khi cache
      await this.cacheManager.set(key, plainUser, 60000);
      return plainUser;

    } catch (error) {
      this.handleError(error, 'Get error');
      throw error;
    }
  }

  async updateUser(id: string, data: UpdateUserDto, currentUser: any) {
    this.logger.log(`Update user attempt: ${id} by ${currentUser.id}`);
    try {
      const user = await this.userModel.findOne({ where: { id } });
      if (!user) {
        this.logger.warn(`Update failed - user not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.id !== String(id)) {
        this.logger.warn(`Unauthorized update attempt by ${currentUser.id} on user ${id}`);
        throw new ForbiddenException('You can only update your own profile');
      }

      // SỬA: Map đúng tên cột trong DB (firstName, lastName thay vì name)
      const updateData: any = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.designation !== undefined) updateData.designation = data.designation;
      if (data.phone !== undefined) updateData.phone = data.phone;

      if (data.roleId) {
        if (currentUser.role !== 'admin') {
          this.logger.warn(`Forbidden role update attempt by ${currentUser.id}`);
          throw new ForbiddenException('Only admin can update role');
        }
        updateData.roleId = data.roleId;
      }
      
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      await user.update(updateData);
      await this.cacheManager.del(`user_${id}`);
      await this.cacheManager.clear();
      this.logger.log(`CACHE INVALIDATED: user_${id}`);
      this.logger.log(`User updated successfully: ${id}`);
      return { message: 'User updated successfully' };

    } catch (error) {
      this.handleError(error, 'Update user error');
      throw error;
    }
  }

  async deleteUser(id: string) {
    this.logger.log(`Delete user attempt: ${id}`);
    try {
      const user = await this.userModel.findOne({ where: { id } });
      if (!user) {
        this.logger.warn(`Delete failed - user not found: ${id}`);
        throw new NotFoundException('Employee not found');
      }

      await user.destroy();
      await this.cacheManager.del(`user_${id}`);
      await this.cacheManager.clear();
      this.logger.log(`CACHE INVALIDATED: user_${id}`);
      this.logger.log(`User deleted successfully: ${id}`);

      return { message: 'Deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete user error');
      throw error;
    }
  }

  async searchUserByName(name: string) {
    this.logger.log(`Search user by name: ${name}`);
    try {
      // SỬA: Tìm kiếm kết hợp cả firstName và lastName vì DB tách 2 cột này
      const users = await this.userModel.findAll({
        where: {
          [Op.or]: [
            { firstName: { [Op.like]: `%${name}%` } },
            { lastName: { [Op.like]: `%${name}%` } }
          ]
        },
        attributes: ['id', 'firstName', 'lastName', 'email', 'designation']
      });
      return users;
    } catch (error) {
      this.handleError(error, 'Search user error');
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    this.logger.log(`Login attempt: ${email}`);
    try {
      const user = await this.userModel.findOne({where: { email },include: [{ model: Role, include: [Permission] }]});
      if (!user) {
        this.logger.warn(`Login failed - user not found: ${email}`);
        throw new NotFoundException('User not found');
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        this.logger.warn(`Login failed - wrong password: ${email}`);
        throw new UnauthorizedException('Wrong password');
      }

      const role = user.role;
      const permissions = role?.permissions?.map(p => p.name) || [];
      const payload = { id: user.id, email: user.email, role: role?.name, permissions };
      const accessToken = await this.jwtService.signAsync(payload, {secret: process.env.JWT_ACCESS_SECRET,expiresIn: process.env.JWT_ACCESS_EXPIRES as any});
      const refreshToken = await this.jwtService.signAsync(payload, {secret: process.env.JWT_REFRESH_SECRET,expiresIn: process.env.JWT_REFRESH_EXPIRES as any});
      const hash = await bcrypt.hash(refreshToken, 10);
      await this.userModel.update({ refreshToken: hash }, { where: { id: user.id } });
      
      this.logger.log(`Login success: ${email}`);
      return {
        message: 'Login success',
        access_token: accessToken,
        refresh_token: refreshToken
      };
    } catch (error) {
      this.handleError(error, 'Login error');
      throw error;
    }
  }

  async createRole(name: string) {
    this.logger.log(`Create role attempt: ${name}`);
    
    try {
      const existing = await this.roleModel.findOne({ where: { name } });
      if (existing) {
        this.logger.warn(`Create role failed - already exists: ${name}`);
        throw new ConflictException('Role already exists'); 
      }
      const newRole = await this.roleModel.create({ name });
      await this.cacheManager.del('roles_all');
      this.logger.log(`CACHE INVALIDATED: roles_all`);
      this.logger.log(`Role created successfully: ${name}`);
      return newRole;

    } catch (error) {
      this.handleError(error, 'Create role error');
      throw error;
    }
  }

  async getRole() {
    const key = 'roles_all';
    this.logger.log('Fetching all roles');
    
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.log(`CACHE HIT: ${key}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${key}`);
      const roles = await this.roleModel.findAll({
        attributes: ['id', 'name', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
      });
      
      const plainRoles = roles.map(role => role.toJSON());

      this.logger.log(`Fetched ${plainRoles.length} roles successfully`);

      await this.cacheManager.set(key, plainRoles, 60000);
      this.logger.log(`CACHE SET: ${key}`);

      return plainRoles;
    } catch (error) {
      this.handleError(error, 'Get roles error');
      throw error;
    }
  }

  async deleteRole(id: string) {
    this.logger.log(`Delete role attempt: ${id}`);
    
    try {
      const role = await this.roleModel.findOne({ where: { id } });

      if (!role) {
        this.logger.warn(`Delete role failed - not found: ${id}`);
        throw new NotFoundException('Role not found'); // SỬA: Đổi từ Employee sang Role
      }

      await role.destroy();

      // THÊM: Xóa cache sau khi xóa thành công
      await this.cacheManager.del('roles_all');
      this.logger.log('CACHE INVALIDATED: roles_all');
      this.logger.log(`Role deleted successfully: ${id}`);

      return {
        message: 'Deleted successfully'
      };
    } catch (error) {
      // THÊM: Khối catch cho đồng bộ với các hàm khác
      this.handleError(error, 'Delete role error');
      throw error;
    }
  }

  async updateRole(id: string, dto: CreateRoleDto) {
    this.logger.log(`Update role attempt: ${id}`);
    
    try {
      const role = await this.roleModel.findOne({ where: { id } });
      if (!role) {
        this.logger.warn(`Update role failed - not found: ${id}`);
        throw new NotFoundException('Role not found');
      }

      if (dto.name) {
        const existing = await this.roleModel.findOne({ where: { name: dto.name } });

        if (existing && existing.id !== id) {
          this.logger.warn(`Update role failed - name exists: ${dto.name}`);
          throw new BadRequestException('Role name already exists');
        }
      }

      await role.update(dto);

      await this.cacheManager.del('roles_all');
      this.logger.log('CACHE INVALIDATED: roles_all');
      this.logger.log(`Role updated successfully: ${id}`);

      return {
        message: 'Update role success',
        data: role
      };
    } catch (error) {
      this.handleError(error, 'Update role error');
      throw error;
    }
  }

  async createCategory(name: string) {
    this.logger.log(`Create category attempt: ${name}`);
    try {
      const existing = await this.categoryModel.findOne({ where: { name } });
      if (existing) {
        this.logger.warn(`Category already exists: ${name}`);
        throw new ConflictException('Category already exists');
      }
      const category = await this.categoryModel.create({ name });
      await this.cacheManager.del('categories_all');
      this.logger.log(`Category created successfully: ${name}`);

      return category;
    } catch (error) {
      this.handleError(error, 'Create category error');
      throw error;
    }
  }

  async getCategories() {
    this.logger.log('Get all categories');
    try {
      const cacheKey = 'categories_all';
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.log('CACHE HIT: categories_all');
        return cached;
      }

      this.logger.warn('CACHE MISS: categories_all');
      const categories = await this.categoryModel.findAll();
      
      const plainCategories = categories.map(c => c.toJSON());
      
      await this.cacheManager.set(cacheKey, plainCategories, 60);
      this.logger.log('Categories cached');
      return plainCategories;
    } catch (error) {
      this.handleError(error, 'Get categories error'); // SỬA: Đổi message log
      throw error;
    }
  }

  async updateCategory(id: string, name: string) {
    this.logger.log(`Update category attempt: ${id}`);
    try {
      const category = await this.categoryModel.findByPk(id);
      if (!category) {
        this.logger.warn(`Category not found: ${id}`);
        throw new NotFoundException('Category not found');
      }

      if (name) {
        const existing = await this.categoryModel.findOne({ where: { name } });
        if (existing && existing.id !== id) {
          this.logger.warn(`Update category failed - name exists: ${name}`);
          throw new ConflictException('Category name already exists');
        }
      }

      await category.update({ name });
      await this.cacheManager.del('categories_all');
      this.logger.log(`Category updated successfully: ${id}`);
      return category;

    } catch (error) {
      this.handleError(error, 'Update category error');
      throw error;
    }
  }

  async deleteCategory(id: string) {
    this.logger.log(`Delete category attempt: ${id}`);
    try {
      const category = await this.categoryModel.findByPk(id);
      if (!category) {
        this.logger.warn(`Category not found: ${id}`);
        throw new NotFoundException('Category not found');
      }

      await category.destroy();
      await this.cacheManager.del('categories_all');
      this.logger.log(`Category deleted successfully: ${id}`);

      return {
        message: 'Category deleted successfully'
      };

    } catch (error) {
      this.handleError(error, 'Delete category error');
      throw error;
    }
  }

  async getProductsByCategory(categoryName: string) {
    this.logger.log(`Get products by category: ${categoryName}`);
    try {
      const products = await this.productModel.findAll({
        include: [{
          model: Category, 
          where: { name: categoryName }, 
          attributes: ['id', 'name']
        }]
      });
      
      const plainProducts = products.map(p => p.toJSON());
      
      this.logger.log(`Products fetched: ${plainProducts.length}`);
      return plainProducts;
    } catch (error) {
      this.handleError(error, 'Get products by category error');
      throw error;
    }
  }

  async getProducts(page: number = 1) {
    this.logger.log(`Get products page ${page}`);
    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      const cacheKey = `products_page_${page}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }
      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const { rows, count } = await this.productModel.findAndCountAll({
        attributes: ['id', 'name', 'unit', 'price', 'thumbnail', 'origin', 'description', 'categoryId'], 
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const plainRows = rows.map(p => p.toJSON());
      const result = {total: count,page,totalPages: Math.ceil(count / limit),data: plainRows};
      await this.cacheManager.set(cacheKey, result, 60);
      this.logger.log('Products cached');
      return result;
    } catch (error) {
      this.handleError(error, 'Get products error');
      throw error;
    }
  }

  async searchProducts(name: string, page: number = 1) {
    this.logger.log(`Search products by name: ${name}, page: ${page}`);
    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      const cacheKey = `product_search_${name}_page_${page}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }
      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const { rows, count } = await this.productModel.findAndCountAll({
        where: { name: { [Op.like]: `%${name}%` } },
        attributes: ['id', 'name', 'unit', 'price', 'thumbnail', 'origin', 'description'],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      const plainRows = rows.map(p => p.toJSON());
      const result = {total: count,page,totalPages: Math.ceil(count / limit),data: plainRows};
      await this.cacheManager.set(cacheKey, result, 60);
      this.logger.log('Product search cached');

      return result;
    } catch (error) {
      this.handleError(error, 'Search product error');
      throw error;
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    this.logger.log(`Update product attempt: ${id}`);
    try {
      const product = await this.productModel.findByPk(id);
      if (!product) {
        this.logger.warn(`Update product failed - product not found: ${id}`);
        throw new NotFoundException('Product not found');
      }
      await product.update(dto);
      await this.cacheManager.clear();
      this.logger.log('CACHE INVALIDATED: All product caches cleared');
      this.logger.log(`Product updated successfully: ${id}`);
      return product;
    } catch (error) {
      this.handleError(error, 'Update product error');
      throw error;
    }
  }

  async deleteProduct(id: string) {
    this.logger.log(`Delete product attempt: ${id}`);
    try {
      const product = await this.productModel.findByPk(id);

      if (!product) {
        this.logger.warn(`Delete failed - product not found: ${id}`);
        throw new NotFoundException('Product not found');
      }
      await product.destroy();
      await this.cacheManager.clear();
      this.logger.log('CACHE INVALIDATED: All product caches cleared');
      this.logger.log(`Product deleted successfully: ${id}`);

      return { message: 'Product deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete product error');
      throw error;
    }
  }

  async createProduct(data: CreateProductDto) {
    this.logger.log(`Create product attempt: ${data.name}`);
    try {
      const existProduct = await this.productModel.findOne({
        where: { name: data.name }
      });
      
      if (existProduct) {
        this.logger.warn(`Create product failed - product exists: ${data.name}`);
        throw new ConflictException('Product already exists');
      }
      const product = await this.productModel.create(data as any);
      await this.cacheManager.clear(); 
      this.logger.log('CACHE INVALIDATED: All product caches cleared');

      this.logger.log(`Product created successfully: ${data.name}`);

      return product;

    } catch (error) {
      this.handleError(error, 'Create product error');
      throw error;
    }
  }
  
  async createOrder(userId: string, dto: CreateOrderDto) {
    this.logger.log(`Create order attempt for user: ${userId}`);
    try {
      const order = await this.orderModel.create({ 
        userId, 
        discountId: dto.discountId || null,
        status:'pending',
        shippingAddress: dto.shippingAddress
      });
      
      this.logger.log(`Order created successfully: ${order.id}`);
      await this.cacheManager.clear();
      return order;
    } catch (error) {
      this.handleError(error, 'Create order error');
      throw error;
    }
  }

  async findByOrder(orderId: string) {
    const cacheKey = `order_items_${orderId}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      
      const items = await this.orderItemModel.findAll({ 
        where: { orderId },
        include: [{ model: Product, attributes: ['id', 'name', 'thumbnail'] }] // Thêm info sản phẩm cho dễ hiển thị
      });
      
      // SỬA: Chuyển về JSON thuần trước khi đưa vào Cache
      const plainItems = items.map(i => i.toJSON());
      
      await this.cacheManager.set(cacheKey, plainItems, 60000);
      return plainItems;
    } catch (error) {
      this.handleError(error, 'Find order items error');
      throw error;
    }
  }

  async getOrders(page: number = 1) {
    this.logger.log(`Get orders page: ${page}`);
    try {
      const limit = 5;
      const offset = (page - 1) * limit;
      
      const { rows, count } = await this.orderModel.findAndCountAll({
        include: [
          { model: OrderItem },
          { 
            model: Users, attributes: ['id', 'firstName', 'lastName', 'email'] 
          },
          {
            model: Discount,
            attributes: ['id', 'discountRate'],
            required: false
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const orders = rows.map(order => {
        const plainOrder = order.toJSON();
        const subtotal = plainOrder.orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discountRate = Number(plainOrder.discount?.discountRate || 0);
        const finalAmount = subtotal - (subtotal * discountRate) / 100;
        
        return {
          ...plainOrder,
          subtotal,
          discountRate,
          finalAmount
        };
      });

      this.logger.log(`Orders fetched successfully: ${orders.length}`);
      return {
        page,
        limit,
        totalOrders: count,
        totalPages: Math.ceil(count / limit),
        data: orders
      };
    } catch (error) {
      this.handleError(error, 'Get orders error');
      throw error;
    }
  }

  async updateOrder(id: string, dto: UpdateOrderDto) {
    this.logger.log(`Update order attempt: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id);
      if (!order) {
        this.logger.warn(`Update failed - order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      const safeData: any = {};
      if (dto.status) safeData.status = dto.status;
      if (dto.shippingAddress) safeData.shippingAddress = dto.shippingAddress;
      if (dto.discountId !== undefined) safeData.discountId = dto.discountId;

      await order.update(safeData);
      
      this.logger.log(`Order updated successfully: ${id}`);
      await this.cacheManager.clear();
      return order;
    } catch (error) {
      this.handleError(error, 'Update order error');
      throw error;
    }
  }

  async deleteOrder(id: string) {
    this.logger.log(`Delete order attempt: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id);
      if (!order) {
        this.logger.warn(`Delete failed - order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      
      await order.destroy();
      await this.cacheManager.clear(); 
      
      this.logger.log(`Order soft deleted successfully: ${id}`);
      return { message: 'Order deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete order error');
      throw error;
    }
  }

  async getOrderById(id: string) {
    const cacheKey = `order_${id}`;
    this.logger.log(`Get order by id: ${id}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const order = await this.orderModel.findByPk(id, {
        include: [
          {
            model: OrderItem,
            attributes: ['id', 'productId', 'quantity'], 
            include: [{model: Product, attributes: ['id', 'name', 'price']}]
          },
          {
            model: Discount,
            attributes: ['id', 'discountRate'],
            required: false
          },
          {
            model: Users,
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!order) {
        this.logger.warn(`Order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      const plainOrder = order.toJSON();
      const subtotal = (plainOrder.orderItems || []).reduce((sum, item) => {
        const itemPrice = item.product?.price || 0;
        return sum + (item.quantity * itemPrice);
      }, 0);

      const discountRate = Number(plainOrder.discount?.discountRate || 0);
      const finalAmount = subtotal - (subtotal * discountRate) / 100;

      const result = {...plainOrder,subtotal,discountRate,finalAmount};
      await this.cacheManager.set(cacheKey, result, 60000);
      this.logger.log(`CACHE SET: ${cacheKey}`);
      this.logger.log(`Order fetched successfully: ${id}`);
      return result;

    } catch (error) {
      this.handleError(error, 'Get order by id error');
      throw error;
    }
  }

  async createOrderItem(data: CreateOrderItemDto) {
    const { orderId, productId, quantity } = data;
    this.logger.log(`Create order item attempt - order: ${orderId}, product: ${productId}`);

    try {
      const product = await this.productModel.findByPk(productId);
      
      if (!product) {
        this.logger.warn(`Create order item failed - product not found: ${productId}`);
        throw new NotFoundException('Product not found');
      }
      const item = await this.orderItemModel.create({ 
        orderId, 
        productId, 
        quantity 
      });
      
      await this.cacheManager.clear();
      this.logger.log(`Order item created successfully - order: ${orderId}, product: ${productId}, quantity: ${quantity}`);
      return item;

    } catch (error) {
      this.handleError(error, 'Create order item error');
      throw error;
    }
  }

  async getAllOrderItem(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const cacheKey = `order_items_page_${page}_limit_${limit}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const { rows, count } = await this.orderItemModel.findAndCountAll({ 
        limit, 
        offset,
        include: [
          { model: Product, attributes: ['id', 'name', 'price', 'thumbnail'] },
          { model: Order, attributes: ['id', 'status'] }
        ]
      });
      const plainRows = rows.map(r => r.toJSON());

      const result = {
        data: plainRows,
        pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
      };

      await this.cacheManager.set(cacheKey, result, 60);
      return result;
    } catch (error) {
      this.handleError(error, 'Get all order items error');
      throw error;
    }
  }

  async updateOrderItem(id: string, data: CreateOrderItemDto) {
    const { productId, quantity } = data;
    this.logger.log(`Update order item attempt: ${id}`);

    try {
      const item = await this.orderItemModel.findByPk(id);
      if (!item) {
        this.logger.warn(`Update failed - order item not found: ${id}`);
        throw new NotFoundException('Order item not found');
      }

      // SỬA: Tìm bằng ID
      const product = await this.productModel.findByPk(productId);
      if (!product) {
        this.logger.warn(`Product not found: ${productId}`);
        throw new NotFoundException('Product not found');
      }
      await item.update({ productId, quantity });
      
      await this.cacheManager.clear();
      this.logger.log(`Order item updated successfully: ${id}`);
      return item;
    } catch (error) {
      this.handleError(error, 'Update order item error');
      throw error;
    }
  }

  async deleteOrderItem(id: string) {
    this.logger.log(`Delete order item attempt: ${id}`);
    try {
      const item = await this.orderItemModel.findByPk(id);
      if (!item) {
        this.logger.warn(`Delete failed - order item not found: ${id}`);
        throw new NotFoundException('Order item not found');
      }

      await item.destroy();
      await this.cacheManager.clear(); 
      
      this.logger.log(`Order item soft deleted successfully: ${id}`);
      return { message: 'Order item deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete order item error');
      throw error;
    }
  }

  async getAllPermissions() {
    this.logger.log('Fetching all permissions grouped by role');
    try {
      const permissions = await this.permissionModel.findAll({
        attributes: ['id', 'name'],
        include: [{ model: this.roleModel, attributes: ['id', 'name'] }]
      });
      const grouped = permissions.reduce((acc, perm) => {
        const role = perm.role; 
        if (!role) return acc;

        const roleName = role.name;
        if (!acc[roleName]) {
          acc[roleName] = [];
        }
        acc[roleName].push({ id: perm.id, name: perm.name });
        return acc;
      }, {} as Record<string, { id: string; name: string }[]>);

      this.logger.log('Permissions fetched successfully');
      return grouped;
    } catch (error) {
      this.handleError(error, 'Get permissions error');
      throw error;
    }
  }

  async getPermissionById(id: string) {
    const key = `permission_${id}`;
    this.logger.log(`Fetching permission: ${id}`);
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.log(`CACHE HIT: ${key}`);
        return cached;
      }
      this.logger.warn(`CACHE MISS: ${key}`);

      const permission = await this.permissionModel.findByPk(id, { include: [Role] });

      if (!permission) {
        this.logger.warn(`Permission not found: ${id}`);
        throw new NotFoundException('Permission not found');
      }

      const result = permission.get({ plain: true });
      await this.cacheManager.set(key, result, 60000);
      this.logger.log(`CACHE SET: ${key}`);

      return result;
    } catch (error) {
      this.handleError(error, 'Get permission by ID error');
      throw error;
    }
  }

  async createPermission(name: string, roleId: string) {
    this.logger.log(`Create permission attempt: ${name} for role ${roleId}`);
    try {
      const role = await this.roleModel.findByPk(roleId);
      if (!role) {
        this.logger.warn(`Create permission failed - role not found: ${roleId}`);
        throw new NotFoundException('Role not found');
      }

      const existing = await this.permissionModel.findOne({ where: { name, roleId } });
      if (existing) {
        this.logger.warn(`Create permission failed - already exists: ${name} (role ${roleId})`);
        throw new BadRequestException('Permission already exists');
      }

      const permission = await this.permissionModel.create({ name, roleId });
      await this.cacheManager.del('permissions_all');
      this.logger.log('CACHE INVALIDATED: permissions_all');

      this.logger.log(`Permission created successfully: ${name} (role ${roleId})`);
      return permission;
    } catch (error) {
      this.handleError(error, 'Create permission error');
      throw error;
    }
  }

  async updatePermission(id: string, dto: PermissionDto) {
    this.logger.log(`Update permission attempt: ${id}`);
    try {
      const permission = await this.permissionModel.findByPk(id);
      if (!permission) {
        this.logger.warn(`Permission not found: ${id}`);
        throw new NotFoundException('Permission not found');
      }

      if (dto.name || dto.roleId) {
        const existing = await this.permissionModel.findOne({
          where: {
            name: dto.name ?? permission.name,
            roleId: dto.roleId ?? permission.roleId
          }
        });
        if (existing && existing.id !== id) {
          this.logger.warn(`Duplicate permission: ${dto.name} (role ${dto.roleId})`);
          throw new BadRequestException('Permission already exists');
        }
      }

      await permission.update(dto);

      await this.cacheManager.del(`permission_${id}`);
      await this.cacheManager.del('permissions_all');
      this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
      this.logger.log(`Permission updated successfully: ${id}`);

      return {
        message: 'Update permission success',
        data: permission,
      };
    } catch (error) {
      this.handleError(error, 'Update permission error');
      throw error;
    }
  }

  async deletePermission(id: string) {
    this.logger.log(`Delete permission attempt: ${id}`);
    try {
      const permission = await this.permissionModel.findByPk(id);
      if (!permission) {
        this.logger.warn(`Delete failed - permission not found: ${id}`);
        throw new NotFoundException('Permission not found');
      }

      await permission.destroy();
      
      await this.cacheManager.del(`permission_${id}`);
      await this.cacheManager.del('permissions_all');
      this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
      this.logger.log(`Permission deleted successfully: ${id}`);

      return {
        message: 'Delete permission success',
      };
    } catch (error) {
      this.handleError(error, 'Delete permission error');
      throw error;
    }
  }

  async getDiscounts(page: number = 1) {
    this.logger.log(`Get discounts page: ${page}`);
    const cacheKey = `discounts_page_${page}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }
      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const limit = 5;
      const offset = (page - 1) * limit;
      const { rows, count } = await this.discountModel.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });


      const plainRows = rows.map(r => r.toJSON());
      const result = {
        page,
        limit,
        totalDiscounts: count,
        totalPages: Math.ceil(count / limit),
        data: plainRows
      };

      await this.cacheManager.set(cacheKey, result, 60);
      return result;

    } catch (error) {
      this.handleError(error, 'Get discounts error');
      throw error;
    }
  }

  async createDiscount(data: DiscountDto) {
    this.logger.log(`Create discount: ${data.name}`);
    try {
      // SỬA: Chỉ lấy name và discountRate, BỎ id (để DB tự tạo)
      const { name, discountRate } = data; 
      const discount = await this.discountModel.create({ name, discountRate });
      
      await this.cacheManager.clear(); // Dùng clear cho an toàn
      this.logger.log(`Discount created successfully: ${discount.id}`);
      return discount;
    } catch (error) {
      this.handleError(error, 'Create discount error');
      throw error;
    }
  }

  async updateDiscount(id: string, dto: DiscountDto) {
    this.logger.log(`Update discount: ${id}`);
    try {
      const discount = await this.discountModel.findByPk(id);
      if (!discount) {
        this.logger.warn(`Update failed - discount not found: ${id}`);
        throw new NotFoundException('Discount not found');
      }

      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.discountRate !== undefined) updateData.discountRate = dto.discountRate;

      await discount.update(updateData);
      await this.cacheManager.clear();
      this.logger.log(`Discount updated successfully: ${id}`);
      return discount;
    } catch (error) {
      this.handleError(error, 'Update discount error');
      throw error;
    }
  }

  async deleteDiscount(id: string) {
    this.logger.log(`Delete discount: ${id}`);
    try {
      const discount = await this.discountModel.findByPk(id);
      if (!discount) {
        this.logger.warn(`Delete failed - discount not found: ${id}`);
        throw new NotFoundException('Discount not found');
      }
      
      await discount.destroy();
      await this.cacheManager.clear(); // SỬA: Dùng clear cho đồng bộ
      this.logger.log(`Discount deleted successfully: ${id}`);
      
      return {
        message: 'Discount deleted successfully'
      };
    } catch (error) {
      this.handleError(error, 'Delete discount error');
      throw error;
    }
  }

  async getImagesByProductId(productId: string) {
    const cacheKey = `product_images_${productId}`;
    this.logger.log(`Fetching images for product: ${productId}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      
      // Sắp xếp theo createdAt mới nhất lên trước
      const images = await this.productImageModel.findAll({
        where: { productId },
        order: [['createdAt', 'DESC']]
      });

      // Chuyển về JSON thuần trước khi đưa vào cache và trả về
      const plainImages = images.map(img => img.toJSON());
      
      await this.cacheManager.set(cacheKey, plainImages, 60000); // Cache 1 phút
      this.logger.log(`Fetched ${plainImages.length} images successfully`);
      
      return plainImages;
    } catch (error) {
      this.handleError(error, 'Get product images error');
      throw error;
    }
  }

  async createProductImage(dto: CreateProductImageDto) {
    this.logger.log(`Create product image attempt for product: ${dto.productId}`);
    
    try {
      const productExists = await this.productModel.findByPk(dto.productId);
      if (!productExists) {
        this.logger.warn(`Create image failed - product not found: ${dto.productId}`);
        throw new NotFoundException('Product not found');
      }

      const image = await this.productImageModel.create(dto as any);
      await this.cacheManager.clear();
      this.logger.log(`Product image created successfully: ${image.id}`);
      
      return image;
    } catch (error) {
      this.handleError(error, 'Create product image error');
      throw error;
    }
  }

  async updateProductImage(id: string, dto: UpdateProductImageDto) {
    this.logger.log(`Update product image attempt: ${id}`);
    
    try {
      const image = await this.productImageModel.findByPk(id);
      if (!image) {
        this.logger.warn(`Update failed - image not found: ${id}`);
        throw new NotFoundException('Product image not found');
      }

      await image.update(dto as any);
      
      await this.cacheManager.clear(); // Xóa cache
      this.logger.log(`Product image updated successfully: ${id}`);
      
      return image;
    } catch (error) {
      this.handleError(error, 'Update product image error');
      throw error;
    }
  }

  async deleteProductImage(id: string) {
    this.logger.log(`Delete product image attempt: ${id}`);
    
    try {
      const image = await this.productImageModel.findByPk(id);
      if (!image) {
        this.logger.warn(`Delete failed - image not found: ${id}`);
        throw new NotFoundException('Product image not found');
      }

      await image.destroy(); // Sequelize tự động dùng Soft Delete vì Model có paranoid: true
      
      await this.cacheManager.clear(); // Xóa cache
      this.logger.log(`Product image soft deleted successfully: ${id}`);
      
      return { message: 'Product image deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete product image error');
      throw error;
    }
  }

   async getAllCarts(page: number = 1) {
    this.logger.log(`Get all carts page: ${page}`);
    const cacheKey = `carts_page_${page}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const limit = 10;
      const offset = (page - 1) * limit;

      const { rows, count } = await this.cartModel.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [{
          model: Users,
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });
      const plainRows = rows.map(r => r.toJSON());
      
      const result = {page,limit,totalCarts: count,totalPages: Math.ceil(count / limit),data: plainRows};

      await this.cacheManager.set(cacheKey, result, 60000);
      return result;
    } catch (error) {
      this.handleError(error, 'Get all carts error');
      throw error;
    }
  }

  async createCart(userId: string) {
    this.logger.log(`Create cart attempt for user: ${userId}`);
    try {
      const existingCart = await this.cartModel.findOne({ where: { userId } });
      
      if (existingCart) {
        this.logger.warn(`Create cart failed - user already has a cart: ${userId}`);
        throw new ConflictException('User already has an active cart');
      }

      const cart = await this.cartModel.create({ userId });
      await this.cacheManager.clear();
      this.logger.log(`Cart created successfully with ID: ${cart.id}`);
      
      return cart;
    } catch (error) {
      this.handleError(error, 'Create cart error');
      throw error;
    }
  }

  async getCartById(id: string) {
    const cacheKey = `cart_${id}`;
    this.logger.log(`Fetching cart by id: ${id}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const cart = await this.cartModel.findByPk(id);
      
      if (!cart) {
        this.logger.warn(`Cart not found: ${id}`);
        throw new NotFoundException('Cart not found');
      }

      const result = cart.toJSON();
      await this.cacheManager.set(cacheKey, result, 60000);
      
      return result;
    } catch (error) {
      this.handleError(error, 'Get cart by id error');
      throw error;
    }
  }

  async deleteCart(id: string) {
    this.logger.log(`Delete cart attempt: ${id}`);
    try {
      const cart = await this.cartModel.findByPk(id);
      if (!cart) {
        this.logger.warn(`Delete failed - cart not found: ${id}`);
        throw new NotFoundException('Cart not found');
      }

      await cart.destroy(); // Soft delete
      
      await this.cacheManager.clear();
      this.logger.log(`Cart soft deleted successfully: ${id}`);
      
      return { message: 'Cart deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete cart error');
      throw error;
    }
  }

  async getCartItemsByCartId(cartId: string) {
    const cacheKey = `cart_items_${cartId}`;
    this.logger.log(`Fetching cart items for cart: ${cartId}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const items = await this.cartItemModel.findAll({
        where: { cartId },
        include: [
          { 
            model: Product, 
            attributes: ['id', 'name', 'thumbnail', 'price'] // Lấy thêm info sản phẩm
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const plainItems = items.map(i => i.toJSON());
      await this.cacheManager.set(cacheKey, plainItems, 60000);
      
      return plainItems;
    } catch (error) {
      this.handleError(error, 'Get cart items error');
      throw error;
    }
  }

  async createCartItem(dto: CreateCartItemDto) {
    this.logger.log(`Create cart item attempt - Cart: ${dto.cartId}, Product: ${dto.productId}`);
    
    try {
      // 1. Kiểm tra giỏ hàng có tồn tại không
      const cart = await this.cartModel.findByPk(dto.cartId);
      if (!cart) throw new NotFoundException('Cart not found');

      // 2. Kiểm tra sản phẩm có tồn tại không
      const product = await this.productModel.findByPk(dto.productId);
      if (!product) throw new NotFoundException('Product not found');

      // 3. BẢO MẬT: Lấy giá trực tiếp từ DB, KHÔNG dùng giá từ Client
      const currentPrice = product.price;

      // 4. (Tùy chọn) Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa để cộng dồn số lượng
      const existingItem = await this.cartItemModel.findOne({
        where: { cartId: dto.cartId, productId: dto.productId }
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + dto.quantity;
        await existingItem.update({ quantity: newQuantity, price: currentPrice });
        await this.cacheManager.clear();
        this.logger.log(`Cart item quantity updated: ${existingItem.id}`);
        return existingItem;
      }

      // 5. Nếu chưa có thì tạo mới
      const item = await this.cartItemModel.create({
        cartId: dto.cartId,
        productId: dto.productId,
        quantity: dto.quantity,
        price: currentPrice // Lưu giá lúc add vào giỏ
      });

      await this.cacheManager.clear();
      this.logger.log(`Cart item created successfully: ${item.id}`);
      return item;
    } catch (error) {
      this.handleError(error, 'Create cart item error');
      throw error;
    }
  }

  async updateCartItem(id: string, dto: UpdateCartItemDto) {
    this.logger.log(`Update cart item attempt: ${id}`);
    
    try {
      const item = await this.cartItemModel.findByPk(id);
      if (!item) {
        this.logger.warn(`Update failed - cart item not found: ${id}`);
        throw new NotFoundException('Cart item not found');
      }

      const updateData: any = {};
      
      if (dto.quantity) {
        updateData.quantity = dto.quantity;
        // Khi cập nhật, đảm bảo lấy lại giá mới nhất của sản phẩm
        const product = await this.productModel.findByPk(item.productId);
        if (product) {
          updateData.price = product.price; 
        }
      }

      await item.update(updateData);
      await this.cacheManager.clear();
      this.logger.log(`Cart item updated successfully: ${id}`);
      
      return item;
    } catch (error) {
      this.handleError(error, 'Update cart item error');
      throw error;
    }
  }

  async deleteCartItem(id: string) {
    this.logger.log(`Delete cart item attempt: ${id}`);
    
    try {
      const item = await this.cartItemModel.findByPk(id);
      if (!item) {
        this.logger.warn(`Delete failed - cart item not found: ${id}`);
        throw new NotFoundException('Cart item not found');
      }

      await item.destroy(); // Soft delete
      await this.cacheManager.clear();
      this.logger.log(`Cart item soft deleted successfully: ${id}`);
      
      return { message: 'Cart item removed successfully' };
    } catch (error) {
      this.handleError(error, 'Delete cart item error');
      throw error;
    }
  }
  
  async getWarehouses(page: number = 1) {
    this.logger.log(`Get warehouses page: ${page}`);
    const cacheKey = `warehouses_page_${page}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const limit = 10;
      const offset = (page - 1) * limit;

      const { rows, count } = await this.warehouseModel.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const plainRows = rows.map(r => r.toJSON());
      const result = {
        page,
        limit,
        totalWarehouses: count,
        totalPages: Math.ceil(count / limit),
        data: plainRows
      };

      await this.cacheManager.set(cacheKey, result, 60000);
      return result;
    } catch (error) {
      this.handleError(error, 'Get warehouses error');
      throw error;
    }
  }

  async getWarehouseById(id: string) {
    const cacheKey = `warehouse_${id}`;
    this.logger.log(`Fetching warehouse: ${id}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const warehouse = await this.warehouseModel.findByPk(id);

      if (!warehouse) {
        this.logger.warn(`Warehouse not found: ${id}`);
        throw new NotFoundException('Warehouse not found');
      }

      const result = warehouse.toJSON();
      await this.cacheManager.set(cacheKey, result, 60000);
      return result;
    } catch (error) {
      this.handleError(error, 'Get warehouse by ID error');
      throw error;
    }
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    this.logger.log(`Create warehouse attempt: ${dto.name}`);
    try {
      const existing = await this.warehouseModel.findOne({ where: { name: dto.name } });
      if (existing) {
        this.logger.warn(`Create warehouse failed - name exists: ${dto.name}`);
        throw new ConflictException('Warehouse name already exists');
      }

      const warehouse = await this.warehouseModel.create(dto as any);
      
      await this.cacheManager.clear();
      this.logger.log(`Warehouse created successfully: ${warehouse.id}`);
      return warehouse;
    } catch (error) {
      this.handleError(error, 'Create warehouse error');
      throw error;
    }
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    this.logger.log(`Update warehouse attempt: ${id}`);
    try {
      const warehouse = await this.warehouseModel.findByPk(id);
      if (!warehouse) {
        this.logger.warn(`Update failed - warehouse not found: ${id}`);
        throw new NotFoundException('Warehouse not found');
      }

      // Nếu cập nhật tên, check xem tên mới có bị trùng với kho khác không
      if (dto.name) {
        const existing = await this.warehouseModel.findOne({ where: { name: dto.name } });
        if (existing && existing.id !== id) {
          this.logger.warn(`Update failed - warehouse name exists: ${dto.name}`);
          throw new ConflictException('Warehouse name already exists');
        }
      }

      await warehouse.update(dto);
      
      await this.cacheManager.clear();
      this.logger.log(`Warehouse updated successfully: ${id}`);
      return warehouse;
    } catch (error) {
      this.handleError(error, 'Update warehouse error');
      throw error;
    }
  }

  async deleteWarehouse(id: string) {
    this.logger.log(`Delete warehouse attempt: ${id}`);
    try {
      const warehouse = await this.warehouseModel.findByPk(id);
      if (!warehouse) {
        this.logger.warn(`Delete failed - warehouse not found: ${id}`);
        throw new NotFoundException('Warehouse not found');
      }

      await warehouse.destroy(); // paranoid: true sẽ tự động soft delete
      
      await this.cacheManager.clear();
      this.logger.log(`Warehouse soft deleted successfully: ${id}`);
      
      return { message: 'Warehouse deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete warehouse error');
      throw error;
    }
  }

  async getInventories(page: number = 1) {
    this.logger.log(`Get inventories page: ${page}`);
    const cacheKey = `inventories_page_${page}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const limit = 10;
      const offset = (page - 1) * limit;

      const { rows, count } = await this.inventoryModel.findAndCountAll({
        limit,
        offset,
        order: [['updatedAt', 'DESC']], // Tồn kho hay thay đổi, sắp theo update
        include: [
          { model: Product, attributes: ['id', 'name', 'thumbnail'] },
          { model: Warehouse, attributes: ['id', 'name', 'address'] }
        ]
      });

      const plainRows = rows.map(r => r.toJSON());
      const result = {
        page,
        limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
        data: plainRows
      };

      await this.cacheManager.set(cacheKey, result, 60000);
      return result;
    } catch (error) {
      this.handleError(error, 'Get inventories error');
      throw error;
    }
  }

  async createInventory(dto: CreateInventoryDto) {
    this.logger.log(`Create inventory attempt - Product: ${dto.productId}, Warehouse: ${dto.warehouseId}`);
    
    try {
      // Bắt buộc phải check Product và Warehouse có tồn tại không để tránh Data rác
      const product = await this.productModel.findByPk(dto.productId);
      if (!product) throw new NotFoundException('Product not found');

      const warehouse = await this.warehouseModel.findByPk(dto.warehouseId);
      if (!warehouse) throw new NotFoundException('Warehouse not found');

      // NGHIỆP VỤ: 1 sản phẩm chỉ được phép có 1 dòng tồn kho trong 1 kho
      const existing = await this.inventoryModel.findOne({
        where: { productId: dto.productId, warehouseId: dto.warehouseId }
      });

      if (existing) {
        this.logger.warn(`Inventory already exists for this product in this warehouse`);
        throw new ConflictException('This product already has an inventory record in this warehouse. Please update the quantity instead.');
      }

      const inventory = await this.inventoryModel.create(dto as any);
      
      await this.cacheManager.clear();
      this.logger.log(`Inventory created successfully: ${inventory.id}`);
      return inventory;
    } catch (error) {
      this.handleError(error, 'Create inventory error');
      throw error;
    }
  }

  async updateInventory(id: string, dto: UpdateInventoryDto) {
    this.logger.log(`Update inventory attempt: ${id}`);
    
    try {
      const inventory = await this.inventoryModel.findByPk(id);
      if (!inventory) {
        this.logger.warn(`Update failed - inventory not found: ${id}`);
        throw new NotFoundException('Inventory record not found');
      }

      // Nếu sửa kho hoặc sản phẩm thì phải check tồn tại
      if (dto.productId) {
        const product = await this.productModel.findByPk(dto.productId);
        if (!product) throw new NotFoundException('New Product not found');
      }
      if (dto.warehouseId) {
        const warehouse = await this.warehouseModel.findByPk(dto.warehouseId);
        if (!warehouse) throw new NotFoundException('New Warehouse not found');
      }

      await inventory.update(dto);
      
      await this.cacheManager.clear();
      this.logger.log(`Inventory updated successfully: ${id}`);
      return inventory;
    } catch (error) {
      this.handleError(error, 'Update inventory error');
      throw error;
    }
  }

  async deleteInventory(id: string) {
    this.logger.log(`Delete inventory attempt: ${id}`);
    
    try {
      const inventory = await this.inventoryModel.findByPk(id);
      if (!inventory) {
        this.logger.warn(`Delete failed - inventory not found: ${id}`);
        throw new NotFoundException('Inventory record not found');
      }

      await inventory.destroy();
      
      await this.cacheManager.clear();
      this.logger.log(`Inventory soft deleted successfully: ${id}`);
      
      return { message: 'Inventory record deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete inventory error');
      throw error;
    }
  }


  

  private handleError(error: unknown, context: string) {
    if (error instanceof Error) {
      this.logger.error(`${context}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
    }
  }
  getHello(): string {
    return 'Minh Quân tới chơi';
  }
}

