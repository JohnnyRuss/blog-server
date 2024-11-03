import { USER_DEFAULT_AVATAR } from "../config/config";
import { CloudinaryConfig as C } from "./";

type UploadImageOptionsT = {
  format?: "webp" | "png" | "jpg";
  folder: "users" | "images";
};

class Cloudinary {
  async deleteImage(url: string): Promise<void> {
    if (url === USER_DEFAULT_AVATAR) return;

    const imagePublicId = this.getPublicIdFromUrl(url);

    await C.api.delete_resources([imagePublicId], {
      resource_type: "image",
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadImageOptionsT
  ): Promise<string> {
    const dataURI = this.getFileDataURI(file);

    const { secure_url } = await C.uploader.upload(dataURI, {
      folder: options.folder,
      resource_type: "image",
      format: options.format || "webp",
      transformation: [{ quality: "good" }],
    });

    return secure_url;
  }

  async updateProfileImage(
    file: Express.Multer.File,
    currentProfileImageUrl: string
  ): Promise<string> {
    const secure_url = await this.uploadImage(file, { folder: "users" });

    if (USER_DEFAULT_AVATAR !== currentProfileImageUrl)
      await this.deleteImage(currentProfileImageUrl);

    return secure_url;
  }

  async updateCategoryThumbnail(
    file: Express.Multer.File,
    currentImageUrl?: string
  ): Promise<string> {
    const secure_url = await this.uploadImage(file, { folder: "images" });

    if (currentImageUrl) await this.deleteImage(currentImageUrl);

    return secure_url;
  }

  ////////////////
  // UTILITIES //
  getPublicIdFromUrl(url: string): string {
    const fragments = url.split("/");

    const publicId = fragments
      .slice(fragments.length - 2)
      .join("/")
      .split(".")[0];

    return publicId;
  }

  getFileDataURI(file: Express.Multer.File): string {
    const base64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${base64}`;

    return dataURI;
  }
}

export default new Cloudinary();
