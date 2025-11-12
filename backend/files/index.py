import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление файлами серверов через FTP - получение списка файлов, создание, удаление
    Args: event с httpMethod, body, queryStringParameters; context с request_id
    Returns: HTTP response с данными файлов
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {})
        server_id = query_params.get('server_id')
        
        if not server_id:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing server_id'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('SELECT * FROM server_files WHERE server_id = %s ORDER BY file_name', (server_id,))
        files = cursor.fetchall()
        
        result = []
        for file in files:
            result.append({
                'id': file['id'],
                'server_id': file['server_id'],
                'file_path': file['file_path'],
                'file_name': file['file_name'],
                'file_size': file['file_size'],
                'file_type': file['file_type'],
                'created_at': file['created_at'].isoformat() if file['created_at'] else None
            })
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'files': result}),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        server_id = body_data.get('server_id')
        file_path = body_data.get('file_path')
        file_name = body_data.get('file_name')
        file_size = body_data.get('file_size', '0 KB')
        file_type = body_data.get('file_type', 'file')
        
        if not server_id or not file_path or not file_name:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing required fields'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('''
            INSERT INTO server_files 
            (server_id, file_path, file_name, file_size, file_type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, server_id, file_path, file_name, file_size, file_type, created_at
        ''', (server_id, file_path, file_name, file_size, file_type))
        
        new_file = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'id': new_file['id'],
                'server_id': new_file['server_id'],
                'file_path': new_file['file_path'],
                'file_name': new_file['file_name'],
                'file_size': new_file['file_size'],
                'file_type': new_file['file_type'],
                'created_at': new_file['created_at'].isoformat()
            }),
            'isBase64Encoded': False
        }
    
    if method == 'DELETE':
        query_params = event.get('queryStringParameters', {})
        file_id = query_params.get('id')
        
        if not file_id:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing file id'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('SELECT file_name FROM server_files WHERE id = %s', (file_id,))
        file = cursor.fetchone()
        
        if not file:
            cursor.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'File not found'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('DELETE FROM server_files WHERE id = %s', (file_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'File deleted', 'file_name': file['file_name']}),
            'isBase64Encoded': False
        }
    
    cursor.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
