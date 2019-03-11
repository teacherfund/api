import sodium from 'sodium-native'
const AWS = require('aws-sdk')
const dynamo = new AWS.DynamoDB()
dynamo.AWS.config.loadFromPath('../../awscredentials.json');
import {CreateAccountBody, UserAccount, GetAccountBody} from '../../@types/account'
const sqlModels = require('../../models')
const TABLE_NAME = 'tokens'

interface AuthToken {
  selector: Buffer
  verifier: Buffer
}
console.log('here')

export const generateAuthToken = async (): Promise<AuthToken> => {
  // generate 16 random bytes as the selector
  // generate 16 random bytes as the verifier - hash it
  const random = Buffer.alloc(32)
  sodium.randombytes_buf(random)
  const selector = random.slice(0, 16)
  const verifier = random.slice(16)
  return { selector, verifier }
}

export const getEmailAuthToken = async (input: AuthToken): Promise<string> => {
  return Buffer.concat([input.selector, input.verifier]).toString('base64')
}

export const getVerifierHash = async (input: AuthToken): Promise<Buffer> => {
  const verifierHash = Buffer.alloc(sodium.crypto_generichash_BYTES)
  sodium.crypto_generichash(verifierHash, input.verifier)
  return verifierHash
}

export const storeAuthToken = async (email: string, role: string, selector: Buffer, verifierHash: Buffer) => {
  // Store email and selector in dynamo DB instance along with hash(verifier)
  var params = {
    Item: {
      email, 
      role,
      selector,
      verifierHash
    }, 
    TableName: TABLE_NAME
  }
  dynamo.putItem(params, (err: Error, data: {}) => {
    if (err) console.log(err, err.stack)
    else {
      console.log(data)
    }    
  })
}

export const splitSelectorVerifier = async (token: string): Promise<AuthToken> => {
  const tokenBuf = Buffer.from(token, 'base64')
  const selector = tokenBuf.slice(0, 16)
  const verifier = tokenBuf.slice(16)
  return { selector, verifier }
}

export const deleteSelector = async (authToken: AuthToken) => {
  // Delete authToken.selector from dynamo db instance
  const params = {
    Key: {
     selector: authToken.selector
    }, 
    TableName: TABLE_NAME
  }
  dynamo.deleteItem(params, (err: Error, _: any) => {
    if (err) console.log(err, err.stack)
    else {
      console.log('deleted', authToken)
    }
  })
}

export const getStoredVerifierHash = async (authToken: AuthToken): Promise<Buffer> => {
  // Lookup resetToken.selector in DB and return stored verifier hash
  const params = {
    Key: {
     selector: authToken.selector
    }, 
    TableName: TABLE_NAME
  }
  dynamo.getItem(params, (err: Error, data: any) => {
    if (err) console.log(err, err.stack)
    else {
      return Promise.resolve(data.verifierHash)
    }
    return
  })
  return Promise.reject('Could not find token')
}

export const compareHashes = async (a: Buffer, b: Buffer): Promise<boolean> => {
  if (a.length !== b.length) return false
  return sodium.sodium_memcmp(a, b)
}

export const createNewAccount = async (body: CreateAccountBody): Promise<UserAccount> => {
  try {
    return sqlModels.Account.findOrCreate({ where: { email: body.email }, defaults: body })
  } catch (e) {
    return Promise.reject(e)
  }
}

export const getAccount = async (body: GetAccountBody): Promise<UserAccount> => {
  try {
    return sqlModels.Account.findOne({ where: { email: body.email }})
  } catch (e) {
    return Promise.reject(e)
  }
}

