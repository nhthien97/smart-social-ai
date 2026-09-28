
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupMember } from './schemas/group-member.scheme';

@Injectable()
export class GroupMembersService {
    constructor(
        @InjectModel(GroupMember.name) private groupMemberModel: Model<GroupMember>,
    ) { }
}
