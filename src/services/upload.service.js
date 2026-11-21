// Upload Image
export const uploadImageToImgBB = async (fileBuffer) => {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error("ImgBB API key is missing");
  }

  const params = new URLSearchParams();
  params.append("image", fileBuffer.toString("base64"));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || "Failed to upload image to ImgBB");
  }

  return result.data.display_url;
};
