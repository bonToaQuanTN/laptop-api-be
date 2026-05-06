import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from '../model/model.role';

@Injectable()
export class SeedRoleService implements OnModuleInit{
    constructor(@InjectModel(Role) private roleModel: typeof Role){} 

    async onModuleInit() {
        await this.createAdminRole();
    }

    async createAdminRole() {
        const roleName = 'admin';
        const role = await this.roleModel.findOne({where: { name: roleName },paranoid: false});
        if (role) {
            console.log('Role admin already exists');
            return;
        }
        await this.roleModel.create({id: 'admin', name: 'admin'});
        console.log('Role admin created successfully');
    }
}