import { appError } from '@kaltura/commons-utils';


export const SharedErrors = {
  objectNotFound: appError('OBJECT_NOT_FOUND'),
  kalturaApiException: appError('KALTURA_API_EXCEPTION'),
};
