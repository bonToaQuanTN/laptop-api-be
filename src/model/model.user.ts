import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Role } from "./model.role";
import { Order } from "./model.order";


@Table({ 
    tableName: "Users",
    version: true,
    paranoid: true
})
export class Users extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 }) 
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false }) 
    declare lastName: string;

    @Column({ type: DataType.STRING, allowNull: false }) 
    declare firstName: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true }) 
    declare email: string;

    @Column({ type: DataType.STRING, allowNull: false }) 
    declare password: string;

    @Column({ type: DataType.STRING, allowNull: false }) 
    declare phone: string;

    @Column({ type: DataType.STRING, allowNull: false }) 
    declare designation: string;

    @ForeignKey(() => Role)
    @Column({ type: DataType.STRING }) 
    declare roleId: string;
    
    @BelongsTo(() => Role) 
    declare role: Role;

    @Column({ type: DataType.STRING, allowNull: true }) 
    declare refreshToken: string;

    @HasMany(() => Order)
    declare orders: Order[];
}