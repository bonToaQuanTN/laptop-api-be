import * as bcrypt from 'bcrypt';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Users } from '../model/model.user';

@Injectable()
export class SeedService implements OnModuleInit{
    constructor(@InjectModel(Users)private userModel: typeof Users) {}
    async onModuleInit() {
        await this.createAdmin();
    }
    async createAdmin() {
        const adminEmail = 'admin@gmail.com';

        const admin = await this.userModel.findOne({where: { email: adminEmail },paranoid: false});
        if (admin) {
            console.log('Admin already exists');
            return;
        }
        const hashedPassword = await bcrypt.hash('string', 10);
        await this.userModel.create({id: '221CTT000',name: 'admin',email: adminEmail,password: hashedPassword,designation: 'test',roleId: 1,version: 0,});
        console.log('Admin created successfully');
    }
}