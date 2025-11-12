import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление базами данных серверов - получение списка БД, создание, удаление
    Args: event с httpMethod, body, queryStringParameters; context с request_id
    Returns: HTTP response с данными баз данных
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
        
        cursor.execute('SELECT * FROM server_databases WHERE server_id = %s ORDER BY created_at DESC', (server_id,))
        databases = cursor.fetchall()
        
        result = []
        for db in databases:
            result.append({
                'id': db['id'],
                'server_id': db['server_id'],
                'db_name': db['db_name'],
                'db_size': db['db_size'],
                'created_at': db['created_at'].isoformat() if db['created_at'] else None
            })
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'databases': result}),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        server_id = body_data.get('server_id')
        db_name = body_data.get('db_name')
        db_size = body_data.get('db_size', '0 MB')
        
        if not server_id or not db_name:
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
            INSERT INTO server_databases 
            (server_id, db_name, db_size)
            VALUES (%s, %s, %s)
            RETURNING id, server_id, db_name, db_size, created_at
        ''', (server_id, db_name, db_size))
        
        new_db = cursor.fetchone()
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
                'id': new_db['id'],
                'server_id': new_db['server_id'],
                'db_name': new_db['db_name'],
                'db_size': new_db['db_size'],
                'created_at': new_db['created_at'].isoformat()
            }),
            'isBase64Encoded': False
        }
    
    if method == 'DELETE':
        query_params = event.get('queryStringParameters', {})
        db_id = query_params.get('id')
        
        if not db_id:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing database id'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('SELECT db_name FROM server_databases WHERE id = %s', (db_id,))
        db = cursor.fetchone()
        
        if not db:
            cursor.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Database not found'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('DELETE FROM server_databases WHERE id = %s', (db_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Database deleted', 'db_name': db['db_name']}),
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
