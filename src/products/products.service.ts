import { HttpStatus, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('ProductsService')

  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
    
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto
    })
  }

  async findAll(paginationDto: PaginationDto) {

    const { page, limit } = paginationDto

    const totalPages = await this.product.count({ where: { available: true } })
    const lastPage = Math.ceil(totalPages / limit);


    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          available: true
        }
      }),
      meta: {
        page: page,
        totalPages: totalPages,
        lastPage: lastPage
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id, available: true }
    });

    if (!product) {
      throw new RpcException({
        message:`Product with id #${id} not found`,
        status: HttpStatus.NOT_FOUND 
      })
    }

    return product;

  }

  async update(id: number, updateProductDto: UpdateProductDto) {

    const { id: _, ...data } = updateProductDto;

    try {
      return await this.product.update({
        where: { id },
        data: data
      }) 
    } catch (e) {
      this.handleErrors(e, id)
    }
  }

  async remove(id: number) {
    
    try {
      const product = await this.product.update({
        where: { id, available: true },
        data: {
          available: false
        }
      })

      return product

    } catch (e) {
      this.handleErrors(e, id)
    }
  }

  private handleErrors(e, id) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        throw new RpcException({ message: `Product with id #${id} not found`, status: HttpStatus.NOT_FOUND });
      }
    }
  }

}
