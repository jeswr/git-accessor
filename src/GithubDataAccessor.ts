import { Readable } from 'node:stream';
import type { Stats } from 'fs-extra';
import { createReadStream, createWriteStream, ensureDir, lstat, opendir, remove, stat } from 'fs-extra';
import type { Quad } from '@rdfjs/types';
import type { Representation } from '@solid/community-server/dist/http/representation/Representation';
import { RepresentationMetadata } from '@solid/community-server/dist/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '@solid/community-server/dist/http/representation/ResourceIdentifier';
import { getLoggerFor } from '@solid/community-server/dist/logging/LogUtil';
import { NotFoundHttpError } from '@solid/community-server/dist/util/errors/NotFoundHttpError';
import { isSystemError } from '@solid/community-server/dist/util/errors/SystemError';
import { UnsupportedMediaTypeHttpError } from '@solid/community-server/dist/util/errors/UnsupportedMediaTypeHttpError';
import { guardStream } from '@solid/community-server/dist/util/GuardedStream';
import type { Guarded } from '@solid/community-server/dist/util/GuardedStream';
import { parseContentType } from '@solid/community-server/dist/util/HeaderUtil';
import { isContainerIdentifier, isContainerPath, joinFilePath } from '@solid/community-server/dist/util/PathUtil';
import { parseQuads, serializeQuads } from '@solid/community-server/dist/util/QuadUtil';
import { addResourceMetadata, updateModifiedDate } from '@solid/community-server/dist/util/ResourceUtil';
import { toLiteral, toNamedTerm } from '@solid/community-server/dist/util/TermUtil';
import { CONTENT_TYPE_TERM, DC, IANA, LDP, POSIX, RDF, SOLID_META, XSD } from '@solid/community-server/dist/util/Vocabularies';
import type { FileIdentifierMapper, ResourceLink } from '@solid/community-server/dist/storage/mapping/FileIdentifierMapper';
import type { DataAccessor } from '@solid/community-server/dist/storage/accessors/DataAccessor';
import { Octokit } from '@octokit/rest';

/**
 * DataAccessor that uses GitHub to store documents as files and containers as folders.
 */
export class GithubDataAccessor implements DataAccessor {
  protected readonly logger = getLoggerFor(this);

  protected readonly resourceMapper: FileIdentifierMapper;
  protected readonly octokit: Octokit;
  protected readonly owner: string;
  protected readonly repo: string;

  public constructor(resourceMapper: FileIdentifierMapper) {
    this.resourceMapper = resourceMapper;
    this.octokit = new Octokit({
      userAgent: 'Solid Agent',
      baseUrl: 'https://api.github.com',
    });
    this.octokit.repos.deleteFile
  }
  
  /**
   * Only binary data can be directly stored as files so will error on non-binary data.
   */
  public async canHandle(representation: Representation): Promise<void> {
    if (!representation.binary) {
      throw new UnsupportedMediaTypeHttpError('Only binary data is supported.');
    }
  }

  getData: (identifier: ResourceIdentifier) => Promise<Guarded<Readable>>;
  getMetadata: (identifier: ResourceIdentifier) => Promise<RepresentationMetadata>;
  getChildren: (identifier: ResourceIdentifier) => AsyncIterableIterator<RepresentationMetadata>;
  writeDocument: (identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata) => Promise<void>;
  writeContainer: (identifier: ResourceIdentifier, metadata: RepresentationMetadata) => Promise<void>;
  writeMetadata: (identifier: ResourceIdentifier, metadata: RepresentationMetadata) => Promise<void>;
  /**
   * Removes the corresponding file/folder (and metadata file).
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const metaLink = await this.resourceMapper.mapUrlToFilePath(identifier, true);
    await remove(metaLink.filePath);

    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false);
    const stats = await this.getStats(link.filePath);

    if (!isContainerIdentifier(identifier) && stats.isFile()) {
      await remove(link.filePath);
    } else if (isContainerIdentifier(identifier) && stats.isDirectory()) {
      await remove(link.filePath);
    } else {
      throw new NotFoundHttpError();
    }
  }

}
