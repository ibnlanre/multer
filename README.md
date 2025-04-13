# @ibnlanre/multer

A comprehensive testing utility library that provides mock implementations for various multer storage engines. This library makes it easy to test file uploads in your Express applications without actually writing files to storage services.

## Features

- Mock implementations for popular multer storage engines:
  - `FakeMulterStorage` - Mock for basic multer disk storage
  - `FakeMulterS3` - Mock for multer-s3 storage
  - `FakeMulterCloudStorage` - Mock for Google Cloud Storage
  - `FakeMulterAzureBlobStorage` - Mock for Azure Blob Storage
- In-memory file storage for testing
- TypeScript support
- Follows original storage engines' interfaces
- Easy to integrate with testing frameworks

## Installation

```bash
npm install --save-dev @ibnlanre/multer
```

## Usage

### Basic Multer Storage Mock

This mock is specifically for the [multer](https://www.npmjs.com/package/multer) package, which is a popular middleware for handling `multipart/form-data` in Node.js. The mock provides a similar interface to the original package, allowing you to test your file uploads without actually writing files to disk.

```typescript
import { FakeMulterStorage } from "@ibnlanre/multer";

// Jest example
jest.mock("multer", () => {
  const originalModule = jest.requireActual("multer");

  return {
    __esModule: true,
    ...originalModule,
    diskStorage: jest.fn((options) => {
      return new FakeMulterStorage(options);
    }),
  };
});

// Vitest example
vi.mock("multer", async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    __esModule: true,
    ...originalModule,
    diskStorage: vi.fn((options) => {
      return new FakeMulterStorage(options);
    }),
  };
});
```

### AWS S3 Storage Mock

This mock is specifically for the [multer-s3](https://www.npmjs.com/package/multer-s3) package, which is a wrapper around the AWS S3 SDK. The mock provides a similar interface to the original package, allowing you to test your file uploads without actually writing files to S3.

```typescript
import { FakeMulterS3 } from "@ibnlanre/multer";

// Jest example
jest.mock("multer-s3", () => {
  const originalModule = jest.requireActual("multer-s3");

  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn((options) => {
      return new FakeMulterS3(options);
    }),
  };
});

// Vitest example
vi.mock("multer-s3", async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    __esModule: true,
    ...originalModule,
    default: vi.fn((options) => {
      return new FakeMulterS3(options);
    }),
  };
});
```

### Google Cloud Storage Mock

This mock is specifically for the [multer-cloud-storage](https://www.npmjs.com/package/multer-cloud-storage) package, which is a wrapper around the Google Cloud Storage SDK. The mock provides a similar interface to the original package, allowing you to test your file uploads without actually writing files to Google Cloud Storage.

```typescript
import { FakeMulterCloudStorage } from "@ibnlanre/multer";

// Jest example
jest.mock("multer-cloud-storage", () => {
  const originalModule = jest.requireActual("multer-cloud-storage");

  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn((options) => {
      return new FakeMulterCloudStorage(options);
    }),
  };
});

// Vitest example
vi.mock("multer-cloud-storage", async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    __esModule: true,
    ...originalModule,
    default: vi.fn((options) => {
      return new FakeMulterCloudStorage(options);
    }),
  };
});
```

### Azure Blob Storage Mock

This mock is specifically for the [multer-azure-blob-storage](https://www.npmjs.com/package/multer-azure-blob-storage) package, which is a wrapper around the Azure Storage SDK. The mock provides a similar interface to the original package, allowing you to test your file uploads without actually writing files to Azure Blob Storage.

```typescript
import { FakeMulterAzureBlobStorage } from "@ibnlanre/multer";

// Jest example
jest.mock("multer-azure-blob-storage", () => {
  const originalModule = jest.requireActual("multer-azure-blob-storage");

  return {
    __esModule: true,
    ...originalModule,
    MulterAzureStorage: jest.fn((options) => {
      return new FakeMulterAzureBlobStorage(options);
    }),
  };
});

// Vitest example
vi.mock("multer-azure-blob-storage", async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    __esModule: true,
    ...originalModule,
    MulterAzureStorage: vi.fn((options) => {
      return new FakeMulterAzureBlobStorage(options);
    }),
  };
});
```

## Utilities

### inMemoryStorage

A Map that stores uploaded files in memory during tests. You can use this to verify file uploads or clear stored files between tests.

```typescript
import { inMemoryStorage } from "@ibnlanre/multer";

// Clear stored files after each test
afterEach(() => {
  inMemoryStorage.clear();
});
```

### makeFile

Utility for creating test file contents in various formats:

```typescript
import { makeFile } from "@ibnlanre/multer";

// Create file content as Buffer
const buffer = makeFile.buffer("test content");

// Create file content as Blob
const blob = makeFile.blob("test content", "text/plain");

// Create file content as ReadableStream
const stream = makeFile.stream("test content");

// Create file content as Readable
const readable = makeFile.readable("test content");
```

## Helpers

### UUID_REGEX

A regular expression to validate UUIDs. This can be useful for testing file names or IDs.

```typescript
import { UUID_REGEX } from "@ibnlanre/multer";

const isValidUUID = (id: string) => {
  return UUID_REGEX.test(id);
};
```

### ETAG_REGEX

A regular expression to validate ETags. This can be useful for testing file identifiers or checksums.

```typescript
import { ETAG_REGEX } from "@ibnlanre/multer";

const isValidETag = (etag: string) => {
  return ETAG_REGEX.test(etag);
};
```

### MD5_REGEX

A regular expression to validate MD5 hashes. This can be useful for testing file integrity or checksums.

```typescript
import { MD5_REGEX } from "@ibnlanre/multer";

const isValidMD5 = (md5: string) => {
  return MD5_REGEX.test(md5);
};
```

## License

BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Publishing

To release a new [version](https://docs.npmjs.com/cli/v8/commands/npm-version/), use the `npm version <new-version>` command. This adheres to [Semantic Versioning](https://semver.org/) principles and requires a [clean working directory](https://git-scm.com/docs/git-status).

Once a version is tagged, publishing occurs automatically. Follow the checklist below to ensure the release process is seamless.

### Checklist

1. **Verify Git configuration**: Ensure your Git username and email are correctly configured. This is necessary for tagging and committing changes.

   ```bash
   git config user.name "Your Name"
   git config user.email "your_email@example.com"
   ```

   Skip this step if your Git [username and email](https://support.atlassian.com/bitbucket-cloud/docs/configure-your-dvcs-username-for-commits/) are already set.

2. **Prepare your working directory**: Ensure there are no uncommitted changes or untracked files. Commit or stash all changes before proceeding.

   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. **Authenticate with npm**: Log in to your npm account if not already authenticated. This step is necessary to publish packages.

   ```bash
   npm adduser
   ```

4. **Update the version**: Run the `npm version` command to increment the version in `package.json` and `package-lock.json`. This command also creates a new [Git tag](https://git-scm.com/docs/git-tag) for the version.

   ```bash
   npm version <new-version>
   ```

   Replace `<new-version>` with one of the following: `major`, `minor`, `patch`, `premajor`, `preminor`, `prepatch`, `prerelease`, or a specific version number.
