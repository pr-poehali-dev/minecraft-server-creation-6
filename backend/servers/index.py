import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление серверами Minecraft - создание, получение, обновление статуса
    Args: event с httpMethod, body, queryStringParameters; context с request_id
    Returns: HTTP response с данными серверов
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        cursor.execute('SELECT * FROM minecraft_servers ORDER BY created_at DESC')
        servers = cursor.fetchall()
        
        result = []
        for server in servers:
            result.append({
                'id': server['id'],
                'server_name': server['server_name'],
                'version': server['version'],
                'port': server['port'],
                'max_players': server['max_players'],
                'gamemode': server['gamemode'],
                'difficulty': server['difficulty'],
                'status': server['status'],
                'created_at': server['created_at'].isoformat() if server['created_at'] else None
            })
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'servers': result}),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        server_name = body_data.get('server_name')
        version = body_data.get('version')
        port = body_data.get('port')
        max_players = body_data.get('max_players', 20)
        gamemode = body_data.get('gamemode', 'survival')
        difficulty = body_data.get('difficulty', 'normal')
        
        if not server_name or not version or not port:
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
            INSERT INTO minecraft_servers 
            (server_name, version, port, max_players, gamemode, difficulty, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, server_name, version, port, max_players, gamemode, difficulty, status, created_at
        ''', (server_name, version, port, max_players, gamemode, difficulty, 'stopped'))
        
        new_server = cursor.fetchone()
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
                'id': new_server['id'],
                'server_name': new_server['server_name'],
                'version': new_server['version'],
                'port': new_server['port'],
                'max_players': new_server['max_players'],
                'gamemode': new_server['gamemode'],
                'difficulty': new_server['difficulty'],
                'status': new_server['status'],
                'created_at': new_server['created_at'].isoformat()
            }),
            'isBase64Encoded': False
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        server_id = body_data.get('id')
        new_status = body_data.get('status')
        
        if not server_id or not new_status:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing id or status'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('''
            UPDATE minecraft_servers 
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, server_name, status
        ''', (new_status, server_id))
        
        updated_server = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        if not updated_server:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Server not found'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'id': updated_server['id'],
                'server_name': updated_server['server_name'],
                'status': updated_server['status']
            }),
            'isBase64Encoded': False
        }
    
    if method == 'DELETE':
        query_params = event.get('queryStringParameters', {})
        server_id = query_params.get('id')
        
        if not server_id:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing server id'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('SELECT server_name FROM minecraft_servers WHERE id = %s', (server_id,))
        server = cursor.fetchone()
        
        if not server:
            cursor.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Server not found'}),
                'isBase64Encoded': False
            }
        
        cursor.execute('DELETE FROM minecraft_servers WHERE id = %s', (server_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Server deleted', 'server_name': server['server_name']}),
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
