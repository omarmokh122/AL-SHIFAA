/**
 * Compress and resize an image to a Base64 string.
 * @param {File} file - The image file from an input.
 * @param {number} maxWidth - Max width for the resized image.
 * @param {number} maxHeight - Max height for the resized image.
 * @returns {Promise<string>} - The resulting Base64 string.
 */
export function compressAndResizeImage(file, maxWidth = 200, maxHeight = 200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Export as JPEG with 0.7 quality to keep size small
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
