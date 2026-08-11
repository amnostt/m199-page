import { BadRequestException } from "@nestjs/common";

interface FileAssetCategoryClient {
  fileAsset: {
    findUnique(args: { where: { id: string } }): Promise<{
      id: string;
      category: string;
    } | null>;
  };
}

export async function assertFileCategory(
  client: FileAssetCategoryClient,
  fileId: string,
  expectedCategory: string,
): Promise<void> {
  const asset = await client.fileAsset.findUnique({
    where: { id: fileId },
  });

  if (!asset) {
    throw new BadRequestException(`FileAsset with id "${fileId}" not found`);
  }

  if (asset.category !== expectedCategory) {
    throw new BadRequestException(
      `FileAsset "${fileId}" must have category ${expectedCategory}`,
    );
  }
}
