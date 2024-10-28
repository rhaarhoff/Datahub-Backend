// src/feature-tier/feature-tier.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeatureTierDto } from './dto/create-feature-tier.dto';
import { UpdateFeatureTierDto } from './dto/update-feature-tier.dto';



@Injectable()
export class FeatureTierService {
  private readonly logger = new Logger(FeatureTierService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Create a new Feature Tier
  async create(createFeatureTierDto: CreateFeatureTierDto) {
    this.logger.log('Creating new feature tier');

    // Check if a feature tier with the same name already exists
    const existingTier = await this.prisma.featureTier.findUnique({
      where: { name: createFeatureTierDto.name },
    });

    if (existingTier) {
      this.logger.warn(`Feature tier with name "${createFeatureTierDto.name}" already exists`);
      throw new BadRequestException('Feature tier with this name already exists');
    }

    // Create the new feature tier
    const newFeatureTier = await this.prisma.featureTier.create({
      data: createFeatureTierDto,
    });

    this.logger.log(`Feature tier created with ID ${newFeatureTier.id}`);
    return newFeatureTier;
  }

  // Get all Feature Tiers with optional pagination
  async findAll(take = 10, skip = 0, includeDeleted = false) {
    this.logger.log(`Fetching all feature tiers, includeDeleted: ${includeDeleted}`);
  
    const featureTiers = await this.prisma.featureTier.findMany({
      take,
      skip,
      where: includeDeleted ? {} : { deletedAt: null }, // If includeDeleted is true, fetch all, otherwise exclude deleted
    });
  
    this.logger.log(`Found ${featureTiers.length} feature tiers`);
    return featureTiers;
  }

  // Get a specific Feature Tier by ID
  async findOne(id: number, includeDeleted = false) {
    this.logger.log(`Fetching feature tier with ID ${id}, includeDeleted: ${includeDeleted}`);
  
    const featureTier = await this.prisma.featureTier.findUnique({
      where: { id },
    });
  
    if (!featureTier || (!includeDeleted && featureTier.deletedAt)) {
      this.logger.warn(`Feature tier with ID ${id} not found or is deleted`);
      throw new NotFoundException(`Feature tier with ID ${id} not found`);
    }
  
    this.logger.log(`Feature tier with ID ${id} found`);
    return featureTier;
  }

  // Update a Feature Tier by ID
  async update(id: number, updateFeatureTierDto: UpdateFeatureTierDto) {
    this.logger.log(`Updating feature tier with ID ${id}`);

    // Check if the feature tier exists
    const existingTier = await this.prisma.featureTier.findUnique({
      where: { id },
    });

    if (!existingTier || existingTier.deletedAt) {
      this.logger.warn(`Feature tier with ID ${id} not found or is deleted`);
      throw new NotFoundException(`Feature tier with ID ${id} not found`);
    }

    // Check if the new name already exists in another tier
    if (updateFeatureTierDto.name && updateFeatureTierDto.name !== existingTier.name) {
      const nameExists = await this.prisma.featureTier.findUnique({
        where: { name: updateFeatureTierDto.name },
      });

      if (nameExists) {
        this.logger.warn(`Feature tier with name "${updateFeatureTierDto.name}" already exists`);
        throw new BadRequestException('Feature tier with this name already exists');
      }
    }

    // Update the feature tier
    const updatedFeatureTier = await this.prisma.featureTier.update({
      where: { id },
      data: updateFeatureTierDto,
    });

    this.logger.log(`Feature tier with ID ${id} updated`);
    return updatedFeatureTier;
  }

  // Soft Delete a Feature Tier by ID
  async remove(id: number) {
    this.logger.log(`Soft deleting feature tier with ID ${id}`);

    // Check if the feature tier exists
    const existingTier = await this.prisma.featureTier.findUnique({
      where: { id },
    });

    if (!existingTier || existingTier.deletedAt) {
      this.logger.warn(`Feature tier with ID ${id} not found or is already deleted`);
      throw new NotFoundException(`Feature tier with ID ${id} not found`);
    }

    // Check if there are features associated with this tier
    const relatedFeatures = await this.prisma.feature.findMany({
      where: { tierId: id },
    });

    if (relatedFeatures.length > 0) {
      this.logger.warn(`Feature tier with ID ${id} has associated features`);
      throw new BadRequestException('Cannot delete feature tier while features are linked to it');
    }

    // Perform a soft delete by setting the deletedAt field
    const deletedFeatureTier = await this.prisma.featureTier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Feature tier with ID ${id} soft deleted`);
    return deletedFeatureTier;
  }

  // Find soft-deleted Feature Tiers
  async findDeleted(take = 10, skip = 0) {
    this.logger.log('Fetching soft-deleted feature tiers');
  
    const deletedFeatureTiers = await this.prisma.featureTier.findMany({
      take,
      skip,
      where: { deletedAt: { not: null } }, // Fetch only deleted tiers
    });
  
    this.logger.log(`Found ${deletedFeatureTiers.length} soft-deleted feature tiers`);
    return deletedFeatureTiers;
  }

  // Restore a soft-deleted Feature Tier by ID
  async restore(id: number) {
    this.logger.log(`Restoring soft-deleted feature tier with ID ${id}`);
  
    // Fetch the soft-deleted feature tier
    const deletedTier = await this.prisma.featureTier.findUnique({
      where: { id },
    });
  
    if (!deletedTier?.deletedAt) {
      this.logger.warn(`Feature tier with ID ${id} not found or is not soft-deleted`);
      throw new NotFoundException(`Feature tier with ID ${id} not found or is not soft-deleted`);
    }
  
    // Restore by setting deletedAt to null
    const restoredFeatureTier = await this.prisma.featureTier.update({
      where: { id },
      data: { deletedAt: null },
    });
  
    this.logger.log(`Feature tier with ID ${id} has been restored`);
    return restoredFeatureTier;
  }
}
