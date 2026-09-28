
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from './schemas/report.scheme';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Post, PostSchema } from '../posts/schemas/post.scheme';
import { User, UserSchema } from '../users/schemas/user.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { UserInteractionsModule } from '../user-interactions/user-interactions.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UserInteractionsModule,
    AdminModule,
  ],

  controllers: [ReportsController],
  providers: [ReportsService, FirebaseService],
  exports: [ReportsService],
})
export class ReportsModule {}
